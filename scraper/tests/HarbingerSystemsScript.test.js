import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Openings | Harbinger Group</title>
  </head>
  <body>
    <h1>Current Openings</h1>
    <p>Explore opportunities at Harbinger Systems.</p>
    <a href="https://harbingergroup.darwinbox.in/ms/candidate/careers">Current Openings</a>
  </body>
</html>
`

const darwinboxPayload = {
  status: 'success',
  job_counts: 2,
  data: [
    {
      id: 'hb-1',
      title: 'Senior Software Engineer',
      department_name: 'Engineering',
      locations: 'Kothrud, Pune, Maharashtra , India',
      country: 'India',
      emp_type_name: 'Full-time',
      experience: '5 - 8 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Build enterprise learning products.</p>',
    },
    {
      id: 'hb-us-1',
      title: 'Program Manager',
      department_name: 'PMO',
      locations: 'Austin, Texas, United States',
      country: 'United States',
      emp_type_name: 'Full-time',
      experience: '7 - 10 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Lead cross-functional delivery.</p>',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../harbingersystems/script.js')
  } catch {
    assert.fail('Expected Harbinger Systems scraper module at ../harbingersystems/script.js')
  }
}

test('Harbinger Systems helpers stay pinned to the verified first-party Darwinbox handoff from Friday, July 17, 2026', async () => {
  const harbinger = await loadModule()

  assert.equal(harbinger.SOURCE, 'harbingersystems')
  assert.equal(harbinger.COMPANY, 'Harbinger Systems')
  assert.equal(harbinger.CAREERS_URL, 'https://www.harbingergroup.com/current-openings/')
  assert.equal(harbinger.DARWINBOX_ORIGIN, 'https://harbingergroup.darwinbox.in')
  assert.equal(harbinger.DARWINBOX_COMPANY_ID, 'main')
  assert.equal(harbinger.DARWINBOX_HANDOFF_URL, 'https://harbingergroup.darwinbox.in/ms/candidate/careers')
  assert.equal(harbinger.VERIFIED_ON, '2026-07-17')
  assert.equal(harbinger.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(harbinger.hasOfficialCareersSignal('<html><body><h1>Current Openings</h1></body></html>'), false)
  assert.equal(
    harbinger.buildDarwinboxListingApiUrl(),
    'https://harbingergroup.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    harbinger.buildDarwinboxJobDetailUrl('hb-1'),
    'https://harbingergroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/hb-1',
  )
})

test('Harbinger Systems run validates the first-party handoff before delegating to the Darwinbox scraper', async () => {
  const harbinger = await loadModule()
  const requestedUrls = []
  const requestedPages = []

  const jobs = await harbinger.createHarbingerSystemsScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === harbinger.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected Harbinger URL: ${url}`)
    },
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      if (page === 1) return darwinboxPayload
      throw new Error(`Unexpected Harbinger page: ${page}`)
    },
  })

  assert.deepEqual(requestedUrls, [harbinger.CAREERS_URL])
  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'harbingersystems')
  assert.equal(
    jobs[0].link,
    'https://harbingergroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/hb-1',
  )
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Harbinger Systems run fails closed when the verified first-party handoff page drifts', async () => {
  const harbinger = await loadModule()

  await assert.rejects(
    harbinger.createHarbingerSystemsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
      fetchListingPage: async () => darwinboxPayload,
    }),
    /verified Harbinger Systems careers page/i,
  )
})
