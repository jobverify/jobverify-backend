import assert from 'node:assert/strict'
import test from 'node:test'
import { createEmbitelTechnologiesScraper } from '../../scraper/embiteltechnologies/script.js'

const CAREERS = 'https://www.embitel.com/work-with-us/'
const OPENINGS = 'https://www.embitel.com/cariad-india-openings'
const SCRIPT = 'https://www.embitel.com/wp-content/themes/astra-child/assets/embitel/wdhub-job.js'
const API = 'https://www.embitel.com/wp-admin/admin-ajax.php'
const HTML = '<title>Work With Embitel - Opportunities At Embitel</title><h2>Opportunities At Embitel</h2><a href="' + OPENINGS + '">CARIAD India Jobs</a>'
const OPENINGS_HTML = '<title>CARIAD India Jobs</title><div id="cariadBody"></div><script>var wdhubJobData = {"ajaxUrl":"' + API + '"};</script><script src="' + SCRIPT + '"></script>'
const CLIENT = 'jQuery(function ($) { $.ajax({ url: wdhubJobData.ajaxUrl, type: "POST", data: { action: "get_wdhub_job" } }); });'
const job = (id, overrides = {}) => ({
  jobpostingID: 'JOB_POSTING-3-' + id, jobcode: 'Backend Developer',
  designation: 'Software Engineer - Software Engineering ( A3 )',
  jobdescription: '<h3>Build services</h3><p>Experience: 5 years</p>', experience: '',
  job_url: 'https://diconium.wd3.myworkdayjobs.com/Embitel_Technologies/job/Bangalore/Backend-Developer_JR' + id,
  bu: 'Cariad', posted: 'Y', timestamp: '2026-07-07T22:27:18.112-07:00', location: 'Bangalore',
  ...overrides,
})
const fetchText = async (url) => {
  if (url === CAREERS) return HTML
  if (url === OPENINGS) return OPENINGS_HTML
  if (url === SCRIPT) return CLIENT
  assert.fail('Retired or unverified URL: ' + url)
}

test('Embitel uses the first-party published AJAX listing and maps its Workday handoffs', async () => {
  const jobs = await createEmbitelTechnologiesScraper({ now: () => '2026-10-03T00:00:00.000Z' }).run({
    fetchText,
    fetchJson: async (url, init) => {
      assert.equal(url, API)
      assert.equal(init.method, 'POST')
      assert.equal(init.body, 'action=get_wdhub_job')
      return { success: true, data: [job('101048'), job('101049', { location: 'Pune', bu: 'Digital_Solutions' })] }
    },
  })
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Software Engineer - Software Engineering ( A3 )')
  assert.equal(jobs[0].jobId, 'JOB_POSTING-3-101048')
  assert.equal(jobs[0].requisitionId, 'JR101048')
  assert.equal(jobs[0].location, 'Bangalore, India')
  assert.equal(jobs[0].jobDescription, 'Build services Experience: 5 years')
  assert.equal(jobs[0].postingDate, '2026-07-08T05:27:18.112Z')
  assert.equal(jobs[0].applyUrl, 'https://diconium.wd3.myworkdayjobs.com/Embitel_Technologies/job/Bangalore/Backend-Developer_JR101048')
  assert.equal(jobs[0].atsPlatform, 'first-party-ajax+workday')
  assert.equal(jobs[1].department, 'Digital Solutions')
  assert.equal(jobs[1].city, 'Pune')
})

test('Embitel accepts only a confirmed success listing; upstream failures and incomplete records reject', async () => {
  for (const payload of [{ success: false, data: [] }, {}, { success: true }, { success: true, data: [job('1', { job_url: 'https://example.com/unrelated' })] }, { success: true, data: [job('1', { designation: '' })] }]) {
    await assert.rejects(createEmbitelTechnologiesScraper().run({ fetchText, fetchJson: async () => payload }), /payload|handoff/)
  }
  const error = new Error('HTTP 404 upstream')
  await assert.rejects(createEmbitelTechnologiesScraper().run({ fetchText, fetchJson: async () => { throw error } }), /HTTP 404 upstream/)
  assert.deepEqual(await createEmbitelTechnologiesScraper().run({ fetchText, fetchJson: async () => ({ success: true, data: [] }) }), [])
})

test('Embitel skips closed and foreign jobs, deduplicates IDs, and marks a requested cap incomplete', async () => {
  const rows = [job('1'), job('1'), job('2', { location: 'BLR-SJR-I Park Mobius Unit 2 (Floor 3)' }), job('3', { posted: 'N' }), job('4', { location: 'Berlin, Germany' })]
  const all = await createEmbitelTechnologiesScraper().run({ fetchText, fetchJson: async () => ({ success: true, data: rows }) })
  assert.equal(all.length, 2)
  assert.equal(all[1].city, 'Bangalore')
  const capped = await createEmbitelTechnologiesScraper({ maxJobs: 1 }).run({ fetchText, fetchJson: async () => ({ success: true, data: rows }) })
  assert.equal(capped.length, 1)
  assert.equal(capped[0].sourceListingComplete, false)
})

test('Embitel rejects missing current client handoff and cancellation before a request', async () => {
  await assert.rejects(createEmbitelTechnologiesScraper().run({ fetchText: async () => '<title>Embitel</title>', fetchJson: async () => assert.fail('No trusted handoff') }), /careers/)
  const controller = new AbortController()
  controller.abort(new Error('cancelled'))
  await assert.rejects(createEmbitelTechnologiesScraper().run({ signal: controller.signal, fetchText: async () => assert.fail('Cancelled') }), /cancelled/)
})
