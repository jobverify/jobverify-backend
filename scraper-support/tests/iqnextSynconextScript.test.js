import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedHomepageHtml = `
<!doctype html>
<html lang="en" data-wf-domain="www.iqnext.io">
  <head>
    <title>IoT Based Platform for Smart Building Management - IQnext</title>
    <link rel="canonical" href="https://www.iqnext.io/" />
  </head>
  <body>
    <main>
      <p>IQnext is a centralised platform that is redefining building operations.</p>
      <p>Building operations efficiency energy maintenance made exceptionally easy.</p>
      <p>Trusted by forward thinking buildings.</p>
    </main>
  </body>
</html>
`

const verifiedCareersHtml = `
<!doctype html>
<html lang="en" data-wf-domain="www.iqnext.io">
  <head>
    <title>Careers | IQnext</title>
    <link rel="canonical" href="https://www.iqnext.io/careers" />
  </head>
  <body>
    <main>
      <h1>Your ideas can power the future of sustainable spaces</h1>
      <p>Take ownership, grow faster, and make an impact that matters.</p>
      <p>See Open Positions</p>
      <p>Why Join IQnext</p>
      <p>Transforming an Industry</p>
      <a href="https://angel.co/company/iqnext/jobs">See Open Positions</a>
      <a href="https://angel.co/company/iqnext/jobs">See our open positions</a>
    </main>
  </body>
</html>
`

const verifiedWellfoundChallengeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>wellfound.com</title>
  </head>
  <body>
    <p id="cmsg">Please enable JS and disable any ad blocker</p>
    <script src="https://ct.captcha-delivery.com/c.js"></script>
  </body>
</html>
`

const loadIqnextSynconextModule = async () => {
  try {
    return await import('../../scraper/iqnextsynconext/script.js')
  } catch {
    assert.fail('Expected IQnext (Synconext) scraper module at ../../scraper/iqnextsynconext/script.js')
  }
}

test('IQnext (Synconext) validates the verified IQnext homepage, careers page, and challenge-gated Wellfound handoff', async () => {
  const iqnextSynconext = await loadIqnextSynconextModule()

  assert.equal(iqnextSynconext.SOURCE, 'iqnextsynconext')
  assert.equal(iqnextSynconext.COMPANY, 'IQnext (Synconext)')
  assert.equal(iqnextSynconext.HOMEPAGE_URL, 'https://www.iqnext.io/')
  assert.equal(iqnextSynconext.CAREERS_URL, 'https://www.iqnext.io/careers')
  assert.equal(iqnextSynconext.WELLFOUND_JOBS_URL, 'https://wellfound.com/company/iqnext/jobs')
  assert.equal(iqnextSynconext.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(iqnextSynconext.hasOfficialCareersSignal(verifiedCareersHtml), true)
  assert.equal(
    iqnextSynconext.extractWellfoundJobsUrl(verifiedCareersHtml),
    'https://wellfound.com/company/iqnext/jobs',
  )
  assert.equal(
    iqnextSynconext.isVerifiedWellfoundChallenge({
      status: 403,
      url: 'https://wellfound.com/company/iqnext/jobs',
      html: verifiedWellfoundChallengeHtml,
    }),
    true,
  )
})

test('IQnext (Synconext) returns no jobs only while the verified IQnext careers handoff remains challenge-gated on Wellfound', async () => {
  const iqnextSynconext = await loadIqnextSynconextModule()
  const requestedUrls = []

  const jobs = await iqnextSynconext.createIqnextSynconextScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === iqnextSynconext.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedHomepageHtml,
        }
      }

      if (url === iqnextSynconext.CAREERS_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedCareersHtml,
        }
      }

      if (url === iqnextSynconext.WELLFOUND_JOBS_URL) {
        return {
          status: 403,
          url,
          headers: {},
          html: verifiedWellfoundChallengeHtml,
        }
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    iqnextSynconext.HOMEPAGE_URL,
    iqnextSynconext.CAREERS_URL,
    iqnextSynconext.WELLFOUND_JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('IQnext (Synconext) fails closed when the IQnext homepage, careers handoff, or challenge-gated Wellfound board changes', async () => {
  const iqnextSynconext = await loadIqnextSynconextModule()

  await assert.rejects(
    iqnextSynconext.createIqnextSynconextScraper().run({
      fetchPage: async (url) => {
        if (url === iqnextSynconext.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><head><title>Unexpected</title></head><body></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    iqnextSynconext.createIqnextSynconextScraper().run({
      fetchPage: async (url) => {
        if (url === iqnextSynconext.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: verifiedHomepageHtml,
          }
        }

        if (url === iqnextSynconext.CAREERS_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: verifiedCareersHtml.replaceAll('https://angel.co/company/iqnext/jobs', 'https://jobs.example.com/iqnext'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified Wellfound jobs handoff/i,
  )

  await assert.rejects(
    iqnextSynconext.createIqnextSynconextScraper().run({
      fetchPage: async (url) => {
        if (url === iqnextSynconext.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: verifiedHomepageHtml,
          }
        }

        if (url === iqnextSynconext.CAREERS_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: verifiedCareersHtml,
          }
        }

        if (url === iqnextSynconext.WELLFOUND_JOBS_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><body><h1>Public jobs are now reachable</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /challenge-gated public surface/i,
  )
})
