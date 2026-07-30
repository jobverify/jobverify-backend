import assert from 'node:assert/strict'
import test from 'node:test'

const loadFasalModule = async () => {
  try {
    return await import('../fasal/script.js')
  } catch {
    assert.fail('Expected Fasal scraper module at ../fasal/script.js')
  }
}

const officialCareersHtml = `
  <html>
    <body>
      <section>
        <p>Join us in bringing a new era to Indian Agriculture</p>
        <a href="https://jobs.fasal.co/jobs/Careers" class="button-5 join-us w-button">View Vacancies</a>
      </section>
    </body>
  </html>
`

const portalHtml = `
  <html>
    <head>
      <title>Jobs at PeoplePlus</title>
      <meta property="og:url" content="https://jobs.fasal.co/jobs/Careers">
      <meta property="og:site_name" content="Wolkus Technology Solutions Private Limited">
    </head>
    <body>
      <input type="hidden" id="pageJson" value="{&quot;detail&quot;:{&quot;meta&quot;:{&quot;title&quot;:&quot;Jobs at PeoplePlus&quot;}}}">
      <input type="hidden" id="moduleMeta" value="[]">
      <input type="hidden" id="jobs" value="[]">
    </body>
  </html>
`

const emptyJobsPayload = {
  code: 'success',
  data: [],
  info: {
    page_name: 'Careers',
  },
}

test('Fasal constants stay pinned to the verified first-party careers handoff and Zoho public jobs API', async () => {
  const fasal = await loadFasalModule()

  assert.equal(fasal.COMPANY_NAME, 'Fasal')
  assert.equal(fasal.SOURCE, 'fasal')
  assert.equal(fasal.OFFICIAL_CAREERS_URL, 'https://www.fasal.co/life-at-fasal')
  assert.equal(fasal.CAREERS_PORTAL_URL, 'https://jobs.fasal.co/jobs/Careers')
  assert.equal(
    fasal.CAREERS_API_URL,
    'https://jobs.fasal.co/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  )
  assert.equal(fasal.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(fasal.hasOfficialPortalSignal(portalHtml), true)
})

test('Fasal run validates the verified empty public board contract and returns no jobs when the API is empty', async () => {
  const fasal = await loadFasalModule()
  const requestedUrls = []

  const jobs = await fasal.createFasalScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return url === fasal.OFFICIAL_CAREERS_URL ? officialCareersHtml : portalHtml
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      return emptyJobsPayload
    },
    now: () => '2026-07-25T12:00:00.000Z',
  })

  assert.deepEqual(
    requestedUrls,
    [fasal.OFFICIAL_CAREERS_URL, fasal.CAREERS_PORTAL_URL, fasal.CAREERS_API_URL],
  )
  assert.deepEqual(fasal.extractIndiaJobs(emptyJobsPayload), [])
  assert.deepEqual(jobs, [])
})

test('Fasal run fails closed when the verified first-party careers page, portal signal, or API payload contract drifts', async () => {
  const fasal = await loadFasalModule()

  await assert.rejects(
    fasal.createFasalScraper().run({
      fetchText: async (url) => (url === fasal.OFFICIAL_CAREERS_URL ? '<html></html>' : portalHtml),
      fetchJson: async () => emptyJobsPayload,
    }),
    /official fasal careers page/i,
  )

  await assert.rejects(
    fasal.createFasalScraper().run({
      fetchText: async (url) => (url === fasal.OFFICIAL_CAREERS_URL ? officialCareersHtml : '<html></html>'),
      fetchJson: async () => emptyJobsPayload,
    }),
    /official fasal careers portal/i,
  )

  await assert.rejects(
    fasal.createFasalScraper().run({
      fetchText: async (url) => (url === fasal.OFFICIAL_CAREERS_URL ? officialCareersHtml : portalHtml),
      fetchJson: async () => ({ code: 'success', info: { page_name: 'Careers' } }),
    }),
    /fasal public jobs api/i,
  )
})
