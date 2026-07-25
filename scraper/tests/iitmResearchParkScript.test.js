import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers Page | IIT Madras Research Park</title>
  </head>
  <body>
    <section>
      <h2>Current Openings</h2>
      <div class="career-card">
        <h4>Electrical Engineer &ndash; Maintenance &amp; Projects (3 Positions)</h4>
        <p>Posted: 16 June 2026</p>
        <p>Valid till: July 09, 2026</p>
        <a href="https://iitmadras4-my.sharepoint.com/example">View / Apply Job</a>
      </div>
      <div class="career-card">
        <h4>Project Manager - Zoho Implementation</h4>
        <p>Posted: 20 Feb 2026</p>
        <p>Valid till: July 15, 2026</p>
        <a href="https://respark.iitm.ac.in/img/carrer/Project-Manager-Zoho-implementation.doc">View / Apply Job</a>
      </div>
      <div class="career-card">
        <h4>Construction Manager - Civil</h4>
        <p>Posted: 03 Mar 2026</p>
        <p>Valid till: July 15, 2026</p>
        <a href="https://respark.iitm.ac.in/img/carrer/Manager-civil.docx">View / Apply Job</a>
      </div>
      <div class="career-card">
        <h4>Executive - Research Collaboration</h4>
        <p>Posted: 03 Apr 2026</p>
        <p>Valid till: July 15, 2026</p>
        <a href="https://respark.iitm.ac.in/img/carrer/ExecutiveResearchCollaboration.docx">View / Apply Job</a>
      </div>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../iitmresearchpark/script.js')
  } catch {
    assert.fail('Expected IITM Research Park scraper module at ../iitmresearchpark/script.js')
  }
}

test('IITM Research Park pins the verified official careers page and expired-public-listings snapshot', async () => {
  const iitmResearchPark = await loadModule()

  assert.equal(iitmResearchPark.SOURCE, 'iitmresearchpark')
  assert.equal(iitmResearchPark.COMPANY_NAME, 'IITM Research Park')
  assert.equal(iitmResearchPark.CAREERS_URL, 'https://respark.iitm.ac.in/careers/')
  assert.equal(iitmResearchPark.VERIFIED_ON, '2026-07-16')
  assert.equal(iitmResearchPark.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.deepEqual(iitmResearchPark.extractObservedJobTitles(officialCareersHtml), [
    'Electrical Engineer - Maintenance & Projects (3 Positions)',
    'Project Manager - Zoho Implementation',
    'Construction Manager - Civil',
    'Executive - Research Collaboration',
  ])
  assert.deepEqual(iitmResearchPark.extractValidTillDates(officialCareersHtml), [
    '2026-07-09',
    '2026-07-15',
    '2026-07-15',
    '2026-07-15',
  ])
  assert.equal(iitmResearchPark.hasLivePublicListings(officialCareersHtml), false)
  assert.equal(iitmResearchPark.matchesVerifiedExpiredSnapshot(officialCareersHtml), true)
})

test('IITM Research Park returns [] only while the verified expired-public-listings snapshot still matches', async () => {
  const iitmResearchPark = await loadModule()
  const requestedUrls = []

  const jobs = await iitmResearchPark.createIITMResearchParkScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === iitmResearchPark.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected IITM Research Park text URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [iitmResearchPark.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('IITM Research Park fails closed when the official page drifts or starts exposing live public jobs again', async () => {
  const iitmResearchPark = await loadModule()

  await assert.rejects(
    iitmResearchPark.createIITMResearchParkScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /official careers page no longer matches the verified public surface/i,
  )

  await assert.rejects(
    iitmResearchPark.createIITMResearchParkScraper().run({
      fetchText: async () =>
        officialCareersHtml.replace(
          'Valid till: July 15, 2026',
          'Valid till: July 20, 2026',
        ),
    }),
    /now exposes live public jobs/i,
  )

  await assert.rejects(
    iitmResearchPark.createIITMResearchParkScraper().run({
      fetchText: async () =>
        officialCareersHtml.replace(
          'Executive - Research Collaboration',
          'Senior Program Manager',
        ),
    }),
    /expired public-listings snapshot no longer matches the verified july 16, 2026 state/i,
  )
})
