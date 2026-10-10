import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { watchAnalysis } from '../scripts/watchFirst1000Laya.js'

const digest = value => createHash('sha256').update(value).digest('hex')

const setup = async t => {
  const prefix = path.join(os.tmpdir(), 'laya-watcher-regression-')
  const directory = await fs.mkdtemp(prefix)
  t.after(async () => {
    assert.ok(path.resolve(directory).startsWith(path.resolve(prefix)), 'temporary cleanup stays in the fixture directory')
    await fs.rm(directory, { recursive: true, force: true })
  })
  const write = (name, value) => fs.writeFile(path.join(directory, name), `${JSON.stringify(value)}\n`)
  await fs.mkdir(path.join(directory, 'scrape'))
  await fs.mkdir(path.join(directory, 'outbox'))
  const sources = Array.from({ length: 1000 }, (_, index) => `source-${index}`)
  const orderedSourcesHash = digest(JSON.stringify(sources))
  const jobs = Array.from({ length: 100 }, (_, index) => ({
    title: `Fixture intern ${index}`, jobDescription: `Full-time internship fixture description ${index}.`,
  }))
  const archiveFile = path.join(directory, 'outbox', 'fixture.jobs.json')
  const archiveText = `${JSON.stringify({ source: sources[0], jobs })}\n`
  await fs.writeFile(archiveFile, archiveText)
  const archiveHash = digest(archiveText)
  const sample = jobs.map((job, index) => ({
    id: `sample-${index}`, source: sources[0],
    input: { title: job.title, body: job.jobDescription, sourceEmploymentType: 'Full-time internship' },
    sourceArchive: { file: archiveFile, hash: archiveHash, jobIndex: index },
  }))
  const reviews = sample.map(job => ({
    id: job.id, source: job.source, label: null, strictLabel: null,
    sourceArchive: { ...job.sourceArchive }, sourceBodySha256: digest(job.input.body),
    labelSource: 'agent_reviewed', humanReviewed: false,
  }))
  await write('manifest.json', { count: 1000, sources, orderedSourcesHash })
  await write('status.json', { phase: 'complete', queuedJobs: 100, pendingJobs: 0 })
  await write('run-exit.json', { complete: true })
  await write('scrape/run-state.json', {
    status: 'complete', completedCount: 1000, totalSources: 1000, catalogSources: sources, completed: {},
  })
  await write('independent-review-packet.json', {
    samplingScopeComplete: true, catalogCompanies: 1000, orderedSourcesHash,
    predictionsHidden: true, countsTowardTraining: false, jobs: sample,
  })
  await write('independent-source-review.json', { reviews })
  const rows = sample.map((job, index) => ({
    id: job.id, sequence: index + 1, source: job.source, status: 'classified', jobType: 'Intern',
    probabilities: { 'Full-time Fresher': .01, 'Full-time Experienced': .01, Intern: .97, Contract: .01 },
    startedAt: new Date(Date.UTC(2026, 9, 5, 12, 0, index)).toISOString(),
    completedAt: new Date(Date.UTC(2026, 9, 5, 12, 0, index)).toISOString(), inferenceSeconds: 0,
    sourceArchive: { ...job.sourceArchive }, view: { sourceBodySha256: digest(job.input.body), windows: 1 },
    job: { title: job.input.title },
  }))
  await fs.writeFile(path.join(directory, 'classified-jobs.jsonl'), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`)
  return { directory, write, sample, reviews }
}

const monitorStatePublication = (t, directory, afterPublish) => {
  const originalRename = fs.rename
  const stateFile = path.join(directory, 'analysis-watcher.json')
  fs.rename = async (from, to) => {
    const result = await originalRename(from, to)
    if (to === stateFile) await afterPublish()
    return result
  }
  t.after(() => { fs.rename = originalRename })
}

test('matching counts cannot complete a review of identities outside the frozen sample', async t => {
  const { directory, write, reviews } = await setup(t)
  await write('independent-source-review.json', {
    reviews: reviews.map((review, index) => ({ ...review, id: `wrong-job-${index}` })),
  })
  monitorStatePublication(t, directory, () => { process.emit('SIGTERM') })
  assert.equal((await watchAnalysis(directory, { intervalSeconds: 10 })).phase, 'stopped')
  const state = JSON.parse(await fs.readFile(path.join(directory, 'analysis-watcher.json'), 'utf8'))
  assert.notEqual(state.phase, 'complete')
  assert.notEqual(state.sourceReviewComplete, true)
  assert.equal(state.classificationModelProcessesStarted, 0)
})

test('a transient Windows watcher-state replacement failure is retried without temporary leftovers', async t => {
  const { directory } = await setup(t)
  const originalRename = fs.rename
  const stateFile = path.join(directory, 'analysis-watcher.json')
  let attempts = 0
  fs.rename = async (from, to) => {
    if (to === stateFile && ++attempts === 1) {
      throw Object.assign(new Error('fixture Windows sharing violation'), { code: 'EACCES' })
    }
    return originalRename(from, to)
  }
  t.after(() => { fs.rename = originalRename })
  const state = await watchAnalysis(directory, { intervalSeconds: 10 })
  assert.equal(state.phase, 'complete')
  assert.equal(state.classificationModelProcessesStarted, 0)
  assert.equal(attempts, 2)
  assert.deepEqual((await fs.readdir(directory)).filter(name => /^analysis-watcher.*(?:\.tmp|\.lock)$/.test(name)), [])
  assert.equal(JSON.parse(await fs.readFile(stateFile, 'utf8')).phase, 'complete')
})

test('two watcher contenders preserve an existing stale ownership file instead of reclaiming it', async t => {
  const { directory, write } = await setup(t)
  const lock = path.join(directory, 'analysis-watcher.lock')
  await write('analysis-watcher.lock', { pid: 2147483647, token: 'fixture-stale-owner' })
  const original = await fs.readFile(lock)
  const contenders = await Promise.allSettled([
    watchAnalysis(directory, { intervalSeconds: 10 }),
    watchAnalysis(directory, { intervalSeconds: 10 }),
  ])
  assert.equal(contenders.filter(row => row.status === 'rejected').length, 2)
  for (const contender of contenders) assert.match(contender.reason.message, /ownership file already exists/)
  assert.deepEqual(await fs.readFile(lock), original)
  await assert.rejects(fs.access(path.join(directory, 'analysis-watcher.json')), { code: 'ENOENT' })
})

test('the final watcher waits for coordinator teardown before completing its publication', async t => {
  const { directory, write } = await setup(t)
  const coordinatorLock = { pid: process.pid, token: 'fixture-coordinator-still-stopping' }
  await write('run.lock', coordinatorLock)
  monitorStatePublication(t, directory, () => { process.emit('SIGTERM') })
  assert.equal((await watchAnalysis(directory, { intervalSeconds: 10 })).phase, 'stopped')
  const waiting = JSON.parse(await fs.readFile(path.join(directory, 'analysis-watcher.json'), 'utf8'))
  assert.equal(waiting.phase, 'waiting_coordinator_exit')
  assert.equal(waiting.pipelineComplete, true)
  assert.equal(waiting.sourceReviewComplete, true)
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, 'run.lock'), 'utf8')), coordinatorLock)
  await fs.rm(path.join(directory, 'run.lock'))
  const finished = await watchAnalysis(directory, { intervalSeconds: 10 })
  assert.equal(finished.phase, 'complete')
  await assert.rejects(fs.access(path.join(directory, 'analysis-watcher.lock')), { code: 'ENOENT' })
})

test('a watcher-state publication error leaves monitoring alive for a later successful refresh', { timeout: 20000 }, async t => {
  const { directory } = await setup(t)
  const originalRename = fs.rename
  const originalError = console.error
  const messages = []
  console.error = message => { messages.push(message) }
  t.after(() => { console.error = originalError; fs.rename = originalRename })
  const stateFile = path.join(directory, 'analysis-watcher.json')
  let attempts = 0
  fs.rename = async (from, to) => {
    if (to === stateFile && ++attempts === 1) throw Object.assign(new Error('fixture publication error'), { code: 'EIO' })
    return originalRename(from, to)
  }
  const finished = await watchAnalysis(directory, { intervalSeconds: 10 })
  assert.equal(finished.phase, 'complete')
  assert.equal(attempts, 2)
  assert.ok(messages.some(message => /watcher state publication failed/.test(message)))
  assert.deepEqual((await fs.readdir(directory)).filter(name => /^analysis-watcher.*(?:\.tmp|\.lock)$/.test(name)), [])
})
