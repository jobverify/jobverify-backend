import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Job from '../src/models/Job.js'
import { classifySavedJobs } from '../scripts/classifySavedJobs.js'
import { classificationShard, postScrapeInput, resolvePostScrapeClassification, sourceGuardedClassification } from '../src/services/postScrapeClassification.js'
import { PUBLIC_JOB_TYPE_EXPRESSION } from '../src/utils/publicJobType.js'
import { getAuthoritativeClassification } from '../src/services/jobClassificationPolicy.js'
import { saveToDB } from '../scraper-support/utils/saveToDB.js'

const now = new Date('2026-10-10T12:00:00Z')
const prediction = label => ({ modelLabel: label, fullDescriptionCovered: true, windows: 2,
  scores: Object.fromEntries(['Full-time Experienced', 'Full-time Fresher', 'Intern', 'Contract']
    .map(value => [value, value === label ? .97 : .01])) })

test('source eligibility guards reject contradictory zero-shot labels and incomplete scans', () => {
  const experienced = { title: 'Engineer', sourceEmploymentType: 'Full time', sourceDescription: 'Minimum 5 years of professional experience required.' }
  assert.equal(resolvePostScrapeClassification(experienced, prediction('Full-time Fresher'), { mode: 'policy', now }).resolved.jobType, 'Full-time Experienced')
  const intern = { title: 'Software Intern', sourceDescription: 'Join our engineering internship.' }
  assert.equal(resolvePostScrapeClassification(intern, prediction('Contract'), { now }).resolved.jobType, 'Intern')
  assert.throws(() => resolvePostScrapeClassification(intern, { ...prediction('Intern'), fullDescriptionCovered: false }), /coverage/)
  assert.notEqual(postScrapeInput(experienced, { now }).inputHash,
    postScrapeInput({ ...experienced, sourceDescription: 'No prior work experience required.' }, { now }).inputHash)
})

test('post-scrape Mongo updates resume, partition, and reject stale source predictions', { timeout: 300000 }, async t => {
  const mongo = new MongoMemoryServer({ binary: { version: '8.2.6',
    downloadDir: fileURLToPath(new URL('../.cache/mongodb-binaries/', import.meta.url)) } })
  t.after(async () => { await mongoose.disconnect(); await mongo.stop() })
  await mongo.start()
  await mongoose.connect(mongo.getUri(), { monitorCommands: true })
  const seed = (key, description = 'Full-time position requiring 3 years of experience.') => Job.create({
    title: 'Engineer', company: 'Trial Company', fingerprint: key, sourceDescription: description,
    status: 'active', sourceEmploymentType: 'Full time', jobType: 'Unspecified',
  })

  await t.test('three workers cover every record once and unchanged reruns perform no inference', async () => {
    await Job.deleteMany({})
    for (let i = 0; i < 12; i++) await seed(`partition-${i}`)
    let calls = 0
    const worker = { classify: async () => { calls++; return prediction('Full-time Experienced') } }
    const results = await Promise.all([0, 1, 2].map(shard => classifySavedJobs({ worker, shard,
      shardCount: 3, mode: 'policy', now: () => now })))
    assert.equal(results.reduce((sum, result) => sum+result.completed, 0), 12)
    assert.equal(calls, 12)
    const rerun = await classifySavedJobs({ worker, mode: 'policy', now: () => now })
    assert.equal(rerun.cached, 12)
    assert.equal(calls, 12)
    for (const row of await Job.find({}).lean()) {
      assert.equal(row.jobType, 'Full-time Experienced')
      assert.equal(row.postClassification.status, 'completed')
      assert.equal(getAuthoritativeClassification(row).jobType, row.jobType)
      assert.equal(row.classification.modelRevision, row.postClassification.result.classification.modelRevision)
    }
    const categories = await Job.aggregate([{ $project: { jobType: PUBLIC_JOB_TYPE_EXPRESSION } }])
    assert.ok(categories.every(row => row.jobType === 'Full-time Experienced'))
  })

  await t.test('a source edit during inference cannot publish the old result and can be retried', async () => {
    await Job.deleteMany({})
    const original = await seed('stale')
    const first = await classifySavedJobs({ mode: 'policy', now: () => now, worker: { classify: async () => {
      await Job.updateOne({ _id: original._id }, { $set: { sourceDescription: 'No prior experience is required. Fresh graduates are welcome.' } })
      return prediction('Full-time Experienced')
    } } })
    assert.equal(first.stale, 1)
    const rejected = await Job.findById(original._id).lean()
    assert.equal(rejected.jobType, 'Unspecified')
    assert.equal(rejected.postClassification.reason, 'source_changed')
    const second = await classifySavedJobs({ mode: 'policy', now: () => now,
      worker: { classify: async () => prediction('Full-time Fresher') } })
    assert.equal(second.completed, 1)
    assert.equal((await Job.findById(original._id).lean()).jobType, 'Full-time Fresher')
  })

  await t.test('unchanged native input is reused when publishing shadow results or refreshing the reference year', async () => {
    await Job.deleteMany({})
    const seeded = await seed('native-reuse')
    let calls = 0
    const worker = { classify: async () => { calls++; return prediction('Full-time Experienced') } }
    const shadow = await classifySavedJobs({ worker, mode: 'shadow', now: () => now })
    assert.equal(shadow.completed, 1)
    assert.equal((await Job.findById(seeded._id).lean()).jobType, 'Unspecified')
    const publish = await classifySavedJobs({ worker, mode: 'policy', now: () => now })
    assert.equal(publish.completed, 1)
    assert.equal(publish.nativeCached, 1)
    assert.equal(calls, 1)
    assert.equal((await Job.findById(seeded._id).lean()).jobType, 'Full-time Experienced')
    const nextYear = await classifySavedJobs({ worker, mode: 'policy', now: () => new Date('2027-01-02T12:00:00Z') })
    assert.equal(nextYear.completed, 1)
    assert.equal(nextYear.nativeCached, 1)
    assert.equal(calls, 1)
    await Job.updateOne({ _id: seeded._id }, { $set: { sourceDescription: 'No prior work experience required. Fresh graduates are welcome.' } })
    const changed = await classifySavedJobs({ worker, mode: 'policy', now: () => now })
    assert.equal(changed.completed, 1)
    assert.equal(changed.nativeCached, 0)
    assert.equal(calls, 2)
    assert.equal((await Job.findById(seeded._id).lean()).jobType, 'Full-time Fresher')
  })

  await t.test('an ATS role URL edit during inference rejects a recovered title and retries the new title', async () => {
    await Job.deleteMany({})
    const sourceDescription='Full-time role requiring three years of professional experience. Build and test software.'
    const original=await Job.create({
      title:'Backend Developer Job Summary ' + 'CSS body { color: black } var DV_LANGUAGE = en_us; '.repeat(150),
      company:'Trial Company', fingerprint:'recovered-title-stale', status:'active', jobType:'Unspecified',
      sourceEmploymentType:'Full time', sourceDescription,
      sourceUrl:'https://employer.applytojob.com/apply/ABC123def4/Backend-Developer',
    })
    const first=await classifySavedJobs({mode:'policy',now:()=>now,worker:{classify:async input=>{
      assert.equal(input.title,'Backend Developer')
      assert.ok(input.body.includes(sourceDescription))
      await Job.updateOne({_id:original._id},{$set:{sourceUrl:'https://employer.applytojob.com/apply/ABC123def4/Frontend-Developer'}})
      return prediction('Full-time Experienced')
    }}})
    assert.equal(first.stale,1)
    assert.equal((await Job.findById(original._id).lean()).jobType,'Unspecified')
    const second=await classifySavedJobs({mode:'policy',now:()=>now,worker:{classify:async input=>{
      assert.equal(input.title,'Frontend Developer')
      assert.ok(input.body.includes(sourceDescription))
      return prediction('Full-time Experienced')
    }}})
    assert.equal(second.completed,1)
    assert.equal(second.nativeCached,0)
    const saved=await Job.findById(original._id).lean()
    assert.equal(saved.sourceDescription,sourceDescription)
    assert.equal(saved.postClassification.result.classification.sourceTitleRecovery.recoveredTitle,'Frontend Developer')
  })

  await t.test('sharded workers fetch full descriptions only for their assigned jobs', async () => {
    await Job.deleteMany({})
    const keys = Array.from({ length: 20 }, (_,index) => `description-read-${index}`)
    const description = 'Full-time position requiring 3 years of professional experience. ' + 'Build reliable software for customers. '.repeat(500)
    for (const key of keys) await seed(key, description)
    const expected = keys.filter(key => classificationShard(key, 3) === 1)
    assert.ok(expected.length > 0 && expected.length < keys.length)
    const returned = []
    const client = mongoose.connection.getClient()
    const collect = event => {
      const cursor = event.reply?.cursor
      if (cursor?.ns?.endsWith('.jobs')) returned.push(...(cursor.firstBatch || cursor.nextBatch || []))
    }
    client.on('commandSucceeded', collect)
    let summary
    try {
      summary = await classifySavedJobs({ mode: 'shadow', shard: 1, shardCount: 3, now: () => now,
        worker: { classify: async input => {
          assert.ok(input.body.includes('Build reliable software for customers.'))
          return prediction('Full-time Experienced')
        } } })
    } finally { client.off('commandSucceeded', collect) }
    assert.equal(summary.scanned, keys.length)
    assert.equal(summary.completed, expected.length)
    const fullDescriptions = returned.filter(row => typeof row.sourceDescription === 'string')
    assert.equal(fullDescriptions.length, expected.length)
    assert.deepEqual(fullDescriptions.map(row => row.fingerprint).sort(), expected.sort())
  })

  await t.test('an aborted shard finishes its current job and resumes without duplicate inference', async () => {
    await Job.deleteMany({})
    const keys = Array.from({ length: 20 }, (_,index) => `abort-shard-${index}`)
    for (const key of keys) await seed(key)
    const assigned = keys.filter(key => classificationShard(key, 3) === 1).length
    assert.ok(assigned > 1)
    const controller = new AbortController()
    let calls = 0
    const first = await classifySavedJobs({ shard: 1, shardCount: 3, mode: 'policy', now: () => now,
      signal: controller.signal, worker: { classify: async () => {
        calls++; controller.abort(); return prediction('Full-time Experienced')
      } } })
    assert.equal(first.completed, 1)
    assert.equal(first.budgetExhausted, true)
    const resumed = await classifySavedJobs({ shard: 1, shardCount: 3, mode: 'policy', now: () => now,
      worker: { classify: async () => { calls++; return prediction('Full-time Experienced') } } })
    assert.equal(resumed.cached, 1)
    assert.equal(resumed.completed, assigned-1)
    assert.equal(calls, assigned)
    assert.equal(await Job.countDocuments({ 'postClassification.status': 'processing' }), 0)
  })

  await t.test('overlapping workers respect a live lease', async () => {
    await Job.deleteMany({})
    await seed('lease')
    let release, enter
    const entered = new Promise(resolve => { enter = resolve })
    const waiting = new Promise(resolve => { release = resolve })
    const first = classifySavedJobs({ now: () => now, worker: { classify: async () => {
      enter(); await waiting; return prediction('Full-time Experienced')
    } } })
    await entered
    const second = await classifySavedJobs({ now: () => now,
      worker: { classify: async () => { throw new Error('A leased record must not be scanned') } } })
    assert.equal(second.leased, 1)
    release()
    assert.equal((await first).completed, 1)
  })

  await t.test('model failure stays retryable; missing description never produces a label', async () => {
    await Job.deleteMany({})
    await seed('retry')
    await seed('missing', '')
    const first = await classifySavedJobs({ now: () => now, worker: { classify: async () => { throw new Error('Temporary worker failure') } } })
    assert.equal(first.failed, 1)
    assert.equal(first.skipped, 1)
    const second = await classifySavedJobs({ now: () => now, worker: { classify: async () => prediction('Full-time Experienced') } })
    assert.equal(second.completed, 1)
    assert.equal(second.skipped, 1)
    assert.equal((await Job.findOne({ fingerprint: 'missing' }).lean()).jobType, 'Unspecified')
  })

  await t.test('scraping queues classification and preserves completed results only for unchanged source content', async t => {
    await Job.deleteMany({})
    const oldMode = process.env.POST_SCRAPE_CLASSIFICATION_MODE
    process.env.POST_SCRAPE_CLASSIFICATION_MODE = 'policy'
    t.after(() => {
      if (oldMode === undefined) delete process.env.POST_SCRAPE_CLASSIFICATION_MODE
      else process.env.POST_SCRAPE_CLASSIFICATION_MODE = oldMode
    })
    const job = { title: 'Software Engineer', company: 'Trial Company', location: 'Bengaluru, India',
      country: 'India', sourceEmploymentType: 'Full time',
      jobDescription: 'Full-time engineering role requiring at least 3 years of professional experience.',
      sourceUrl: 'https://example.com/jobs/deferred-engineer', applyUrl: 'https://example.com/jobs/deferred-engineer',
    }
    const options = { now, classifier: { mode: 'policy', classifyJobs: () => {
      throw new Error('Scraping must not request the classification model')
    } }, enrichPublicExperience: false,
      replaceExisting: false, enqueueAlerts: false, refreshDatasetSummary: false }
    await saveToDB([job], 'deferred-trial', options)
    let saved = await Job.findOne({}).lean()
    assert.equal(saved.postClassification.status, 'pending')
    assert.equal(saved.postClassification.inputHash, postScrapeInput(saved, { now }).inputHash)
    let calls = 0
    const worker = { classify: async () => { calls++; return prediction('Full-time Experienced') } }
    assert.equal((await classifySavedJobs({ worker, mode: 'policy', now: () => now })).completed, 1)
    await saveToDB([job], 'deferred-trial', { ...options, now: new Date(now.getTime()+60000) })
    saved = await Job.findOne({}).lean()
    assert.equal(saved.postClassification.status, 'completed')
    assert.equal(getAuthoritativeClassification(saved).jobType, 'Full-time Experienced')
    assert.equal((await classifySavedJobs({ worker, mode: 'policy', now: () => now })).cached, 1)
    assert.equal(calls, 1)
    await saveToDB([{ ...job, jobDescription: 'Full-time position. No prior work experience is required. Fresh graduates welcome.' }], 'deferred-trial', options)
    saved = await Job.findOne({}).lean()
    assert.equal(saved.postClassification.status, 'pending')
    assert.equal(saved.classification, undefined)
    assert.equal(saved.postClassification.inputHash, postScrapeInput(saved, { now }).inputHash)
  })
})

test('stable sharding assigns every key to exactly one worker', () => {
  for (let i = 0; i < 1000; i++) assert.ok([0, 1, 2].includes(classificationShard(`job-${i}`, 3)))
  assert.throws(() => classificationShard('job', 0), /shard/)
})

test('employer field layouts and occupational contracts preserve the source meaning', () => {
  const fixtures = [
    [{ title: 'Intern_Maintenance', sourceDescription: 'Employment Type:\nInternship\nStrong Python knowledge.' }, 'Intern'],
    [{ title: 'Contractor_Replacement_JL10', sourceDescription: '10+ years of software engineering experience.' }, 'Contract'],
    [{ title: 'Oracle Service Contract Functional Consultant', sourceDescription: 'Requires 2-15 years as an Oracle functional specialist.' }, 'Full-time Experienced'],
    [{ title: 'Finance Analyst (Contract accounting)', sourceDescription: 'Minimum 3 years of accounting experience.' }, 'Full-time Experienced'],
    [{ title: 'Finance Analyst (Contract accounting) (Contract)', sourceDescription: 'This position is a contract role. 3 years of experience.' }, 'Contract'],
    [{ title: 'Contract Accountant', sourceDescription: 'Fixed-term employment for six months. 3 years of experience.' }, 'Contract'],
  ]
  for (const [job, expected] of fixtures) {
    const original = structuredClone(job)
    const result = sourceGuardedClassification(job, { now, mode: 'policy' })
    assert.equal(result.resolved.jobType, expected, job.title)
    assert.equal(result.inputHash, postScrapeInput(job, { now }).inputHash)
    assert.deepEqual(job, original)
  }
})

test('development review formats preserve contract occupations and explicit eligibility', () => {
  const fixtures = [
    [{ title: 'Contract Admin Team Lead', sourceDescription: 'Lead procurement contracting. Position requirements: 5+ years of experience in procurement.' }, 'Full-time Experienced'],
    [{ title: 'Contract Admin Team Lead (Contract)', sourceDescription: 'This position is a contract role. 5+ years of experience.' }, 'Contract'],
    [{ title: 'Developer', sourceDescription: 'We have an exciting opportunity for energetic and enthusiastic fresher\u2019s interested in HTML development. Basic knowledge of HTML.' }, 'Full-time Fresher'],
    [{ title: 'Developer', sourceDescription: 'We have an exciting opportunity for freshers. Minimum 3 years of professional experience required.' }, 'Full-time Experienced'],
    [{ title: 'Trainer', sourceDescription: 'Provide an exciting opportunity for corporate freshers to learn Java. Minimum 3 years of professional experience required.' }, 'Full-time Experienced'],
    [{ title: 'IDMC Developer', sourceDescription: 'Location - Bangalore Exp- 4 to 8 Years Desired Competencies: Informatica and SQL.' }, 'Full-time Experienced'],
    [{ title: 'Product Engineer', sourceDescription: 'Our EXP-4-8 product improves delivery. Basic SQL knowledge.' }, 'Unspecified'],
  ]
  for (const [job, expected] of fixtures) {
    const original = structuredClone(job)
    const result = sourceGuardedClassification(job, { now, mode: 'policy' })
    assert.equal(result.resolved.jobType, expected, job.sourceDescription)
    assert.equal(result.inputHash, postScrapeInput(job, { now }).inputHash)
    assert.deepEqual(job, original)
  }
})

test('explicit fresher recruitment is eligible without overriding mandatory experience', () => {
  for (const [sourceDescription, withRequiredExperience] of [
    ['We are currently hiring fresh graduates for our customer support team. Excellent communication skills.', 'Full-time Experienced'],
    ['Requirements: Excellent communication skills. Freshers can also apply.', 'Unspecified'],
  ]) {
    assert.equal(sourceGuardedClassification({ title: 'Customer Support', sourceDescription }, { now }).resolved.jobType, 'Full-time Fresher')
    assert.equal(sourceGuardedClassification({ title: 'Customer Support', sourceDescription: `${sourceDescription} Minimum 3 years of professional experience required.` }, { now }).resolved.jobType, withRequiredExperience)
  }
})

test('application forms and mixed advertisements cannot establish a vacancy experience requirement', () => {
  const descriptions = [
    'How did you know about this opportunity? LinkedIn Indeed. Your submission has been received. Cookie settings.',
    "Choose how you'd like to proceed. Choose how you'd like to share your resume. For certain roles and recent graduates, transcripts are needed.",
    'Academic Project Details. Personal Education Skills Others. Expected salary. Having any reference? Please wait submitting your resume.',
    'ADVT./2026-27/09 Print Application. ADVT./2026-27/08 Print Application. ADVT./2026-27/07 Print Application. Recruitment of Fresher Candidates.',
  ]
  for (const sourceDescription of descriptions) {
    const job = { title: 'Engineer', sourceDescription, sourceExperienceRequired: 'No experience required' }
    const result = resolvePostScrapeClassification(job, prediction('Full-time Fresher'), { now, mode: 'policy' })
    assert.equal(result.resolved.jobType, 'Unspecified', sourceDescription)
    assert.equal(result.status, 'uncertain')
    assert.equal(result.reason, 'insufficient_role_description')
    assert.equal(result.resolved.experienceRequired, null)
    assert.equal(result.resolved.experienceProfile.minimumYears, null)
    assert.equal(result.resolved.experienceProfile.hasExplicitExperience, false)
    assert.equal(result.complete, true) // Coverage is independent of eligibility confidence.
    assert.equal(result.inputHash, postScrapeInput(job, { now }).inputHash)
  }
  const valid = { title: 'Engineer', sourceExperienceRequired: 'No experience required',
    sourceDescription: 'Responsibilities: Build and test software for our customers. Requirements: Knowledge of Python. How did you know about this opportunity? LinkedIn Indeed.' }
  assert.equal(sourceGuardedClassification(valid, { now }).resolved.jobType, 'Full-time Fresher')
  assert.equal(sourceGuardedClassification({ ...valid, sourceDescription: descriptions[0],
    requirements: 'Knowledge of Python and SQL; no prior professional experience required.' }, { now }).resolved.jobType, 'Full-time Fresher')
})

test('empty responsibilities and zero-default experience metadata stay uncertain', () => {
  const job = { title: 'Assistant Vice President, Data Protection', sourceExperienceRequired: 'No experience required',
    sourceDescription: 'Key RESPONSIBILITIES:\nZoom in Zoom out Short Info Experience: 0 Years - 0 Months To 0 Years - 0 Months Share this Job' }
  const result = sourceGuardedClassification(job, { now })
  assert.equal(result.resolved.jobType, 'Unspecified')
  assert.ok(result.sourceQualityIssues.includes('empty_responsibilities_zero_experience_default'))
  assert.equal(sourceGuardedClassification({ ...job, requirements: 'Fresh graduates can apply. Knowledge of data protection and communication skills.' }, { now }).resolved.jobType, 'Full-time Fresher')
})
