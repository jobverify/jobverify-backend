import assert from 'node:assert/strict'
import test from 'node:test'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Ambulance Services | RED.Health Products - Quality Care</title>
  </head>
  <body>
    <h1>WE'RE BUILDING INDIA'S 911</h1>
    <p>CAN WE COUNT YOU IN?</p>
    <a href="https://redhealth.darwinbox.in/ms/candidatev2/main">Discover Roles</a>
    <h2>HIRING PROCESS</h2>
    <p>Profile Screening</p>
    <p>Panel Interviews</p>
    <p>Bar Raiser Round</p>
    <p>Offer Discussion</p>
  </body>
</html>
`

const loadStanPlusModule = async () => {
  try {
    return await import('../stanplus/script.js')
  } catch {
    assert.fail('Expected StanPlus scraper module at ../stanplus/script.js')
  }
}

test('StanPlus scraper constants stay pinned to the verified RED.Health careers handoff and timed-out Darwinbox routes', async () => {
  const stanPlus = await loadStanPlusModule()

  assert.equal(stanPlus.SOURCE, 'stanplus')
  assert.equal(stanPlus.COMPANY, 'StanPlus')
  assert.equal(stanPlus.COMPANY_DOMAIN, 'red.health')
  assert.equal(stanPlus.CAREERS_URL, 'https://www.red.health/career')
  assert.equal(stanPlus.OFFICIAL_CAREERS_HANDOFF_URL, 'https://redhealth.darwinbox.in/ms/candidatev2/main')
  assert.equal(stanPlus.VERIFIED_AT, '2026-07-17')
  assert.deepEqual(stanPlus.DARWINBOX_TIMEOUT_ROUTE_URLS, [
    'https://redhealth.darwinbox.in/jobs',
    'https://redhealth.darwinbox.in/ms/candidate/careers',
    'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/home',
    'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/allJobs',
    'https://redhealth.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  ])
  assert.equal(stanPlus.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(
    stanPlus.extractOfficialDarwinboxUrl(careersPageHtml),
    'https://redhealth.darwinbox.in/ms/candidatev2/main',
  )
  assert.equal(stanPlus.isExpectedTimedOutSurface({ errorKind: 'timeout', status: null, html: null }), true)
  assert.equal(
    stanPlus.hasUnexpectedPublicJobSurface({
      status: 200,
      html: '<html><body><h1>Current Openings</h1><button>Search Jobs</button><a href="/apply">Apply</a></body></html>',
    }),
    true,
  )
})

test('StanPlus returns no jobs while the verified careers page handoff stays fixed and public Darwinbox routes remain timed out', async () => {
  const stanPlus = await loadStanPlusModule()
  const requestedUrls = []

  const jobs = await stanPlus.createStanPlusScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === stanPlus.CAREERS_URL) {
        return { status: 200, url, html: careersPageHtml, errorKind: null }
      }

      if (stanPlus.DARWINBOX_TIMEOUT_ROUTE_URLS.includes(url)) {
        return { status: null, url, html: null, errorKind: 'timeout' }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    stanPlus.CAREERS_URL,
    ...stanPlus.DARWINBOX_TIMEOUT_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('StanPlus fails closed when the careers handoff drifts or a public Darwinbox jobs surface becomes reachable', async () => {
  const stanPlus = await loadStanPlusModule()

  await assert.rejects(
    stanPlus.createStanPlusScraper().run({
      fetchPage: async (url) => {
        if (url === stanPlus.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersPageHtml.replace(
              'https://redhealth.darwinbox.in/ms/candidatev2/main',
              'https://example.com/jobs',
            ),
            errorKind: null,
          }
        }

        return { status: null, url, html: null, errorKind: 'timeout' }
      },
    }),
    /verified Darwinbox handoff/i,
  )

  await assert.rejects(
    stanPlus.createStanPlusScraper().run({
      fetchPage: async (url) => {
        if (url === stanPlus.CAREERS_URL) {
          return { status: 200, url, html: careersPageHtml, errorKind: null }
        }

        if (url === 'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/allJobs') {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Current Openings</h1><button>Search Jobs</button></body></html>',
            errorKind: null,
          }
        }

        return { status: null, url, html: null, errorKind: 'timeout' }
      },
    }),
    /public Darwinbox jobs surface/i,
  )
})
