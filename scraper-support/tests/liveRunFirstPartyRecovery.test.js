import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as capital from '../../scraper/capitalnumbersinfotech/script.js'
import * as systech from '../../scraper/systechsolutions/script.js'
import * as threePillar from '../../scraper/3pillarglobal/script.js'
import { buildScrapers } from '../providers/index.js'
import { isIndiaJob } from '../utils/indiaLocationFilter.js'

const capitalHtml = readFileSync(new URL('./fixtures/capitalnumbersinfotech/current-openings.html', import.meta.url), 'utf8')
const systechHtml = `<title>Careers at Systech \u2013 Data, AI &amp; Analytics Roles \u2013 Systech Solutions</title>
<p>Open positions &amp; life at Systech</p><p>See open roles</p><p>US Job Openings</p><p>Chennai, India</p>
<script>fetch("${systech.JOBS_LIST_API_URL}");fetch("${systech.JOBS_DETAIL_API_URL}")</script>`
const systechJob = { cr21b_jobid: 'c2afe061-06a6-f111-b8de-70a8a59bac0b', cr21b_jobname: 'Platform Administrator (Alteryx)', cr21b_minyearsofexperience: 3 }
const runThreePillar = (payload) => threePillar.run({
  fetchText: async (url) => url === threePillar.CAREERS_URL ? '<h1>3Pillar Career Opportunities</h1>' : '<h1>Job openings at 3Pillar</h1>',
  fetchJson: async () => payload,
})

test('Capital Numbers publishes all four verified current public role cards', async () => {
  const jobs = await capital.run({ fetchText: async () => capitalHtml })
  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs.map((job) => job.jobId), ['senior-full-stack-data-engineer', 'sales-development-representative', 'technical-project-manager', 'technical-architect-ai-engineering'])
  assert.equal(jobs[0].title, 'Senior Full Stack Data Engineer')
  assert.equal(jobs[0].source, 'capitalnumbersinfotech')
  assert.equal(jobs[0].applyUrl, 'https://www.capitalnumbers.com/careers/senior-full-stack-data-engineer')
})

test('Capital Numbers rejects an incomplete reported listing', async () => {
  await assert.rejects(capital.run({ fetchText: async () => capitalHtml.replace('4 open positions', '5 open positions') }), /incomplete/i)
})

test('Capital Numbers does not silently drop a malformed role card', async () => {
  await assert.rejects(capital.run({ fetchText: async () => capitalHtml.replace('Senior Full Stack Data Engineer', '') }), /incomplete/i)
})

test('Capital Numbers does not relabel a foreign role as India', () => {
  const jobs = capital.extractJobs(capitalHtml.replace('Hyderabad', 'New York, United States'))
  assert.equal(isIndiaJob(jobs[0]), false)
  assert.notEqual(jobs[0].country, 'India')
})

test('Systech accepts valid nonempty public jobs without inventing India location', async () => {
  const jobs = await systech.run({ fetchText: async () => systechHtml, fetchJson: async () => [systechJob] })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Platform Administrator (Alteryx)')
  assert.equal(jobs[0].country, null)
  assert.equal(jobs[0].location, null)
  assert.equal(isIndiaJob(jobs[0]), false)
  assert.equal(new URL(jobs[0].applyUrl).searchParams.get('jobId'), 'c2afe061-06a6-f111-b8de-70a8a59bac0b')
})

test('Systech rejects a partially malformed jobs payload', async () => {
  await assert.rejects(systech.run({ fetchText: async () => systechHtml, fetchJson: async () => [systechJob, { unknown: true }] }), /incomplete/i)
})

test('3Pillar accepts a verified empty Lever array', async () => {
  assert.deepEqual(await runThreePillar([]), [])
})

test('3Pillar rejects malformed nonempty Lever payloads', async () => {
  for (const payload of [{ error: 'unavailable' }, [{ text: 'Engineer', categories: { location: 'Chennai, India' }, hostedUrl: 'https://jobs.lever.co/3pillarglobal/example' }]]) {
    await assert.rejects(runThreePillar(payload), /incomplete|array/i)
  }
})

test('Script adapter preserves explicitly unknown country before the India filter', async () => {
  const source = buildScrapers().find(item => item.name === 'systechsolutions')
  const jobs = await source.run({ fetchText: async () => systechHtml, fetchJson: async () => [systechJob] })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].country, null)
  assert.equal(isIndiaJob(jobs[0]), false)
})

test('3Pillar caller limits cannot mark a truncated listing complete', async () => {
  const payload = ['one', 'two'].map(id => ({ id, text: 'Engineer', categories: { location: 'Chennai, India' }, hostedUrl: 'https://jobs.lever.co/3pillarglobal/' + id }))
  const jobs = await threePillar.createThreePillarGlobalScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => url === threePillar.CAREERS_URL ? '<h1>3Pillar Career Opportunities</h1>' : '<h1>Job openings at 3Pillar</h1>',
    fetchJson: async () => payload,
  })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].sourceListingComplete, false)
})

test('3Pillar invalid caller caps never become successful empty snapshots', async () => {
  for (const maxJobs of [0, -1, NaN, 1.5]) {
    await assert.rejects(async () => threePillar.createThreePillarGlobalScraper({ maxJobs }).run({ fetchText: async () => { throw new Error('Transport must not run') } }), /maxJobs.*positive integer|invalid.*limit/i)
  }
})

test('3Pillar rejects an empty or short API inventory that contradicts its current board roles', async () => {
  const board = '<h1>Job openings at 3Pillar</h1><a href="https://jobs.lever.co/3pillarglobal/one">Engineer</a><a href="https://jobs.lever.co/3pillarglobal/two">Designer</a>'
  const one = { id: 'one', text: 'Engineer', categories: { location: 'Chennai, India' }, hostedUrl: 'https://jobs.lever.co/3pillarglobal/one' }
  for (const payload of [[], [one]]) await assert.rejects(threePillar.run({
    fetchText: async url => url === threePillar.CAREERS_URL ? '<h1>3Pillar Career Opportunities</h1>' : board, fetchJson: async () => payload,
  }), /incomplete|board.*inventory/i)
  const jobs = await threePillar.run({
    fetchText: async url => url === threePillar.CAREERS_URL ? '<h1>3Pillar Career Opportunities</h1>' : board + '<a href="https://jobs.lever.co/3pillarglobal/one/apply">Apply</a>',
    fetchJson: async () => [one, { ...one, id: 'two', hostedUrl: 'https://jobs.lever.co/3pillarglobal/two' }],
  })
  assert.equal(jobs.length, 2)
})
