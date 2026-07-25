import assert from 'node:assert/strict'
import test from 'node:test'

const jobsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Join Our Team</h1>
    <h2>Current Openings</h2>
    <h2>Accounting Job Openings</h2>
    <h3>Senior Accountant (JOB ID: VIS-FS-ARI-MRF-062026-52029) - 1 Position</h3>
    <p>Quick books, Bill.com, Good Communication is a Must. | Experience: 7+ Years | Location: Coimbatore</p>
    <p>Posted on: 19-06-2026</p>
    <a href="https://www.velaninfo.com/apply/senior-accountant">Apply Now</a>

    <h2>BPO/KPO Job Openings</h2>
    <h3>Process Executive (JOB ID: 072026-62028) - 8 Positions</h3>
    <p>Basic computer knowledge and problem-solving abilities. | Experience: 0 to 1 Year | Location: Coimbatore</p>
    <p>Posted on: 10-07-2026</p>
    <a href="https://www.velaninfo.com/apply/process-executive">Apply Now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../velaninfoservices/script.js')
  } catch {
    assert.fail('Expected Velan Info Services scraper module at ../velaninfoservices/script.js')
  }
}

test('Velan Info Services validates the first-party openings page and extracts jobs', async () => {
  const velan = await loadModule()

  assert.equal(velan.SOURCE, 'velaninfoservices')
  assert.equal(velan.COMPANY, 'Velan Info Services')
  assert.equal(velan.JOBS_URL, 'https://www.velaninfo.com/jobs')
  assert.equal(velan.VERIFIED_ON, '2026-07-18')
  assert.equal(velan.hasOfficialJobsSignal(jobsHtml), true)

  const jobs = velan.extractJobs(jobsHtml)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Senior Accountant')
  assert.equal(jobs[0].jobId, 'VIS-FS-ARI-MRF-062026-52029')
  assert.equal(jobs[0].location, 'Coimbatore, India')
  assert.equal(jobs[1].title, 'Process Executive')
  assert.equal(jobs[1].jobId, '072026-62028')
})

test('Velan Info Services run decorates extracted first-party openings', async () => {
  const velan = await loadModule()
  const requestedUrls = []

  const jobs = await velan.createVelanInfoServicesScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === velan.JOBS_URL) return jobsHtml
      throw new Error(`Unexpected Velan URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [velan.JOBS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'velaninfoservices')
  assert.equal(jobs[0].scrapedAt, '2026-07-18T00:00:00.000Z')
  assert.equal(jobs[1].applyUrl, 'https://www.velaninfo.com/apply/process-executive')
})

test('Velan Info Services fails closed when the verified openings page drifts', async () => {
  const velan = await loadModule()

  await assert.rejects(
    velan.createVelanInfoServicesScraper().run({
      fetchText: async () => '<html><body>Unexpected</body></html>',
    }),
    /verified first-party current openings page/i,
  )
})
