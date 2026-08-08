import assert from 'node:assert/strict'
import test from 'node:test'

const loadPrepinstaModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected PrepInsta scraper module at ./script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>PrepInsta Career Opportunities</title>
  </head>
  <body>
    <main>
      <h2>Join Our Team</h2>
      <p>Join us, on our journey to help upskill students and get them placed</p>
      <a href="https://angel.co/company/prepinsta">Start Your Career With Us</a>
      <h2>All Open Positions</h2>
      <a href="https://angel.co/company/prepinsta/jobs">Click Here to Check</a>
    </main>
  </body>
</html>
`

const blockedPublicJobsPage = {
  status: 403,
  url: 'https://wellfound.com/company/prepinsta/jobs',
  html: `
    <html lang="en">
      <head><title>wellfound.com</title></head>
      <body>
        <p>Please enable JS and disable any ad blocker</p>
      </body>
    </html>
  `,
}

const currentBlockedPublicJobsPage = {
  status: 403,
  url: 'https://wellfound.com/company/prepinsta/jobs',
  html: `
    <html lang="en-US">
      <head><title>Just a moment...</title></head>
      <body>
        <p>Checking if the site connection is secure</p>
        <p>Enable JavaScript and cookies to continue</p>
        <p>Email us at team@wellfound.com if you're facing issues.</p>
        <p>Cloudflare Ray ID: 1234567890abcdef</p>
      </body>
    </html>
  `,
}

test('PrepInsta scraper pins the verified official careers page and blocked Wellfound handoff', async () => {
  const prepinsta = await loadPrepinstaModule()

  assert.equal(prepinsta.SOURCE, 'prepinsta')
  assert.equal(prepinsta.COMPANY, 'PrepInsta')
  assert.equal(prepinsta.CAREERS_URL, 'https://prepinsta.com/career-opportunities/')
  assert.equal(prepinsta.START_CAREER_URL, 'https://angel.co/company/prepinsta')
  assert.equal(prepinsta.PUBLIC_JOBS_URL, 'https://angel.co/company/prepinsta/jobs')
  assert.equal(prepinsta.BLOCKED_PUBLIC_JOBS_FINAL_URL, 'https://wellfound.com/company/prepinsta/jobs')
  assert.equal(prepinsta.VERIFIED_ON, '2026-08-07')
  assert.equal(prepinsta.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    prepinsta.extractStartCareerUrl(officialCareersHtml),
    'https://angel.co/company/prepinsta',
  )
  assert.equal(
    prepinsta.extractPublicJobsUrl(officialCareersHtml),
    'https://angel.co/company/prepinsta/jobs',
  )
  assert.equal(prepinsta.hasBlockedPublicJobsSignal(blockedPublicJobsPage), true)
  assert.equal(prepinsta.hasBlockedPublicJobsSignal(currentBlockedPublicJobsPage), true)
})

test('PrepInsta scraper returns no jobs while the official Wellfound board stays blocked', async () => {
  const prepinsta = await loadPrepinstaModule()
  const requestedUrls = []

  const jobs = await prepinsta.createPrepinstaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === prepinsta.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === prepinsta.PUBLIC_JOBS_URL) {
        return blockedPublicJobsPage
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    prepinsta.CAREERS_URL,
    prepinsta.PUBLIC_JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('PrepInsta scraper returns no jobs while the Friday, August 7, 2026 Cloudflare interstitial blocks the Wellfound board', async () => {
  const prepinsta = await loadPrepinstaModule()
  const requestedUrls = []

  const jobs = await prepinsta.createPrepinstaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === prepinsta.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === prepinsta.PUBLIC_JOBS_URL) {
        return currentBlockedPublicJobsPage
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    prepinsta.CAREERS_URL,
    prepinsta.PUBLIC_JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('PrepInsta scraper fails closed when the verified careers handoff changes', async () => {
  const prepinsta = await loadPrepinstaModule()

  await assert.rejects(
    prepinsta.createPrepinstaScraper().run({
      fetchPage: async (url) => {
        if (url === prepinsta.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml.replace(
              'https://angel.co/company/prepinsta/jobs',
              'https://angel.co/company/prepinsta/roles',
            ),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified public jobs handoff/i,
  )
})

test('PrepInsta scraper fails closed when the public jobs surface stops matching the blocked state', async () => {
  const prepinsta = await loadPrepinstaModule()

  await assert.rejects(
    prepinsta.createPrepinstaScraper().run({
      fetchPage: async (url) => {
        if (url === prepinsta.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === prepinsta.PUBLIC_JOBS_URL) {
          return {
            status: 200,
            url: prepinsta.BLOCKED_PUBLIC_JOBS_FINAL_URL,
            html: `
              <html>
                <body>
                  <h1>PrepInsta Jobs</h1>
                  <a href="/company/prepinsta/jobs/1">Software Engineer</a>
                </body>
              </html>
            `,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public jobs surface now appears usable or changed shape/i,
  )
})
