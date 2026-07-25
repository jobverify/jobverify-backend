import assert from 'node:assert/strict'
import test from 'node:test'

const officialJobsHtml = `
  <html>
    <head>
      <title>Jobs - Lybrate</title>
    </head>
    <body>
      <h1>Come work with us!</h1>
      <h2>CURRENT OPENINGS</h2>
      <script>
        url = 'https://api.lever.co/v0/postings/lybrate?group=team&mode=json'
      </script>
      <footer>
        <a href="https://www.lybrate.com/delhi/dentist">Dentist in Delhi</a>
        <a href="https://www.lybrate.com/jobs">Careers</a>
      </footer>
    </body>
  </html>
`

const officialAboutHtml = `
  <html>
    <body>
      <p>Be a part of Lybrate.</p>
      <a class="btn btn-white btn-lg" href="https://www.lybrate.com/jobs">We're Hiring</a>
    </body>
  </html>
`

const deadEmbeddedApiResponse = {
  ok: false,
  error: 'Document not found',
}

const liveEmbeddedApiResponse = [
  {
    text: 'Software Engineer',
    hostedUrl: 'https://jobs.lever.co/lybrate/software-engineer',
  },
]

const loadLybrateModule = async () => {
  try {
    return await import('../lybrate/script.js')
  } catch {
    assert.fail('Expected Lybrate scraper module at ../lybrate/script.js')
  }
}

test('Lybrate sentinel pins the verified stale first-party jobs shell and dead embedded API constants', async () => {
  const lybrate = await loadLybrateModule()

  assert.equal(lybrate.SOURCE, 'lybrate')
  assert.equal(lybrate.COMPANY_NAME, 'Lybrate')
  assert.equal(lybrate.VERIFIED_ON, '2026-07-16')
  assert.equal(lybrate.HOMEPAGE_URL, 'https://www.lybrate.com/')
  assert.equal(lybrate.JOBS_PAGE_URL, 'https://www.lybrate.com/jobs')
  assert.equal(lybrate.ABOUT_PAGE_URL, 'https://www.lybrate.com/about')
  assert.equal(
    lybrate.JOBS_API_URL,
    'https://api.lever.co/v0/postings/lybrate?group=team&mode=json',
  )

  assert.equal(lybrate.hasOfficialJobsPageSignal(officialJobsHtml), true)
  assert.equal(
    lybrate.hasOfficialJobsPageSignal(
      officialJobsHtml.replace('https://api.lever.co/v0/postings/lybrate?group=team&mode=json', ''),
    ),
    false,
  )
  assert.equal(lybrate.hasOfficialAboutPageSignal(officialAboutHtml), true)
  assert.equal(
    lybrate.hasOfficialAboutPageSignal(
      officialAboutHtml.replace('https://www.lybrate.com/jobs', 'https://www.lybrate.com/contact-us'),
    ),
    false,
  )
  assert.equal(lybrate.isDeadEmbeddedJobsApiResponse(deadEmbeddedApiResponse), true)
  assert.equal(lybrate.isDeadEmbeddedJobsApiResponse(liveEmbeddedApiResponse), false)
})

test('Lybrate sentinel returns [] only while the first-party jobs shell still points at a dead embedded API', async () => {
  const lybrate = await loadLybrateModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await lybrate.createLybrateScraper().run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)

      if (url === lybrate.JOBS_PAGE_URL) return officialJobsHtml
      if (url === lybrate.ABOUT_PAGE_URL) return officialAboutHtml

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)

      if (url === lybrate.JOBS_API_URL) return deadEmbeddedApiResponse
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTextUrls, [
    lybrate.JOBS_PAGE_URL,
    lybrate.ABOUT_PAGE_URL,
  ])
  assert.deepEqual(requestedJsonUrls, [lybrate.JOBS_API_URL])
  assert.deepEqual(jobs, [])
})

test('Lybrate sentinel fails closed when the first-party jobs shell or embedded API changes materially', async () => {
  const lybrate = await loadLybrateModule()

  await assert.rejects(
    lybrate.createLybrateScraper().run({
      fetchText: async (url) => {
        if (url === lybrate.JOBS_PAGE_URL) {
          return officialJobsHtml.replace('CURRENT OPENINGS', 'LATEST ROLES')
        }
        if (url === lybrate.ABOUT_PAGE_URL) {
          return officialAboutHtml
        }
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => deadEmbeddedApiResponse,
    }),
    /verified official jobs page no longer matches the verified public surface/i,
  )

  await assert.rejects(
    lybrate.createLybrateScraper().run({
      fetchText: async (url) => {
        if (url === lybrate.JOBS_PAGE_URL) return officialJobsHtml
        if (url === lybrate.ABOUT_PAGE_URL) return officialAboutHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => liveEmbeddedApiResponse,
    }),
    /embedded jobs api no longer matches the verified dead public surface/i,
  )
})
