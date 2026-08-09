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

const darwinboxCandidateV2ShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title></title>
    <base href="/ms/candidatev2/">
    <script type="module" src="/ms/dboxuilibrary/assets/dboxuilib_dist/www/build/db-components.esm.js"></script>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
  </head>
  <body>
    <app-root ng-class="clearfix"></app-root>
  </body>
</html>
`

const darwinboxCandidateShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title></title>
    <base href="/ms/candidate/">
    <script type="module" src="/ms/dboxuilibrary/assets/dboxuilib_dist/www/build/db-components.esm.js"></script>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
  </head>
  <body>
    <app-root ng-class="clearfix"></app-root>
  </body>
</html>
`

const blockedListingApiHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Attention Required! | Cloudflare</title>
  </head>
  <body>
    <div id="cf-wrapper">
      <p>Sorry, you have been blocked</p>
      <p>You are unable to access darwinbox.in</p>
      <p>Please enable cookies.</p>
      <p>Cloudflare Ray ID: 1234567890</p>
    </div>
  </body>
</html>
`

const loadStanPlusModule = async () => {
  try {
    return await import('../../scraper/stanplus/script.js')
  } catch {
    assert.fail('Expected StanPlus scraper module at ../../scraper/stanplus/script.js')
  }
}

test('StanPlus scraper constants stay pinned to the verified RED.Health careers handoff and current Darwinbox shell surfaces', async () => {
  const stanPlus = await loadStanPlusModule()

  assert.equal(stanPlus.SOURCE, 'stanplus')
  assert.equal(stanPlus.COMPANY, 'StanPlus')
  assert.equal(stanPlus.COMPANY_DOMAIN, 'red.health')
  assert.equal(stanPlus.CAREERS_URL, 'https://www.red.health/career')
  assert.equal(stanPlus.OFFICIAL_CAREERS_HANDOFF_URL, 'https://redhealth.darwinbox.in/ms/candidatev2/main')
  assert.equal(stanPlus.VERIFIED_AT, '2026-08-05')
  assert.deepEqual(stanPlus.DARWINBOX_TIMEOUT_ROUTE_URLS, [
    'https://redhealth.darwinbox.in/jobs',
    'https://redhealth.darwinbox.in/ms/candidate/careers',
    'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/home',
    'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/allJobs',
    'https://redhealth.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  ])
  assert.equal(stanPlus.DARWINBOX_LISTING_API_URL, 'https://redhealth.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main')
  assert.equal(stanPlus.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(
    stanPlus.extractOfficialDarwinboxUrl(careersPageHtml),
    'https://redhealth.darwinbox.in/ms/candidatev2/main',
  )
  assert.equal(stanPlus.hasBlankDarwinboxShellSignal(darwinboxCandidateV2ShellHtml), true)
  assert.equal(stanPlus.hasBlankDarwinboxShellSignal(darwinboxCandidateShellHtml), true)
  assert.equal(
    stanPlus.hasBlockedDarwinboxListingApiSignal({ status: 403, html: blockedListingApiHtml }),
    true,
  )
  assert.equal(
    stanPlus.hasUnexpectedPublicJobSurface({
      status: 200,
      html: '<html><body><h1>Current Openings</h1><button>Search Jobs</button><a href="/apply">Apply</a></body></html>',
    }),
    true,
  )
})

test('StanPlus returns no jobs while the verified careers handoff stays fixed and Darwinbox only exposes blank shells plus a blocked API', async () => {
  const stanPlus = await loadStanPlusModule()
  const requestedUrls = []

  const jobs = await stanPlus.createStanPlusScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === stanPlus.CAREERS_URL) {
        return { status: 200, url, finalUrl: url, html: careersPageHtml, errorKind: null }
      }

      if (url === stanPlus.DARWINBOX_LISTING_API_URL) {
        return { status: 403, url, finalUrl: url, html: blockedListingApiHtml, errorKind: null }
      }

      if (url === 'https://redhealth.darwinbox.in/ms/candidate/careers') {
        return { status: 200, url, finalUrl: url, html: darwinboxCandidateShellHtml, errorKind: null }
      }

      if (stanPlus.DARWINBOX_TIMEOUT_ROUTE_URLS.includes(url)) {
        return {
          status: 200,
          url,
          finalUrl: url === 'https://redhealth.darwinbox.in/jobs'
            ? 'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/home'
            : url,
          html: darwinboxCandidateV2ShellHtml,
          errorKind: null,
        }
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
            finalUrl: url,
            html: careersPageHtml.replace(
              'https://redhealth.darwinbox.in/ms/candidatev2/main',
              'https://example.com/jobs',
            ),
            errorKind: null,
          }
        }

        return { status: 200, url, finalUrl: url, html: darwinboxCandidateV2ShellHtml, errorKind: null }
      },
    }),
    /verified Darwinbox handoff/i,
  )

  await assert.rejects(
    stanPlus.createStanPlusScraper().run({
      fetchPage: async (url) => {
        if (url === stanPlus.CAREERS_URL) {
          return { status: 200, url, finalUrl: url, html: careersPageHtml, errorKind: null }
        }

        if (url === 'https://redhealth.darwinbox.in/ms/candidatev2/main/careers/allJobs') {
          return {
            status: 200,
            url,
            finalUrl: url,
            html: '<html><body><h1>Current Openings</h1><button>Search Jobs</button><a href="/apply">Apply</a></body></html>',
            errorKind: null,
          }
        }

        if (url === stanPlus.DARWINBOX_LISTING_API_URL) {
          return { status: 403, url, finalUrl: url, html: blockedListingApiHtml, errorKind: null }
        }

        return { status: 200, url, finalUrl: url, html: darwinboxCandidateV2ShellHtml, errorKind: null }
      },
    }),
    /public Darwinbox jobs surface/i,
  )
})
