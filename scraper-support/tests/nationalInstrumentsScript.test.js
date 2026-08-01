import assert from 'node:assert/strict'
import test from 'node:test'

const loadNationalInstrumentsModule = async () => {
  try {
    return await import('../../scraper/nationalinstruments/script.js')
  } catch {
    assert.fail('Expected National Instruments scraper module at ../../scraper/nationalinstruments/script.js')
  }
}

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - NI</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>In late 2023, we joined Emerson's newly created Test &amp; Measurement business group.</p>
      <a href="https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions">
        See open roles
      </a>
    </main>
  </body>
</html>
`

const oracleUnavailableHtml = `
<html>
  <head>
    <title>Service Unavailable</title>
  </head>
  <body>
    <h1>Service Unavailable - DNS failure</h1>
    <p>The server is temporarily unable to service your request. Please try again later.</p>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>NI Career Site</title>
    <base data-apibaseurl="https://pef.fa.us1.oraclecloud.com:443" />
  </head>
  <body>
    <h1>Job Search Results</h1>
    <article data-job-id="ni-001">
      <h2>Applications Engineer</h2>
    </article>
  </body>
</html>
`

test('National Instruments sentinel constants stay pinned to the verified NI careers handoff and linked Oracle outage', async () => {
  const nationalInstruments = await loadNationalInstrumentsModule()

  assert.equal(nationalInstruments.SOURCE, 'nationalinstruments')
  assert.equal(nationalInstruments.COMPANY, 'National Instruments')
  assert.equal(nationalInstruments.OFFICIAL_BRAND_NAME, 'NI')
  assert.equal(nationalInstruments.VERIFIED_ON, '2026-07-16')
  assert.equal(nationalInstruments.HOMEPAGE_URL, 'https://www.ni.com/')
  assert.equal(nationalInstruments.CAREERS_URL, 'https://www.ni.com/en/about-ni/careers.html')
  assert.equal(
    nationalInstruments.ORACLE_REQUISITIONS_URL,
    'https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions',
  )
  assert.equal(
    nationalInstruments.ORACLE_ROOT_URL,
    'https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1',
  )
  assert.equal(
    nationalInstruments.LISTING_API_URL,
    'https://pef.fa.us1.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=5,offset=0,location=India',
  )
  assert.deepEqual(nationalInstruments.ACCEPTED_UNAVAILABLE_STATUSES, [503])

  assert.equal(nationalInstruments.pageHasOfficialNationalInstrumentsSignals(careersHtml), true)
  assert.equal(
    nationalInstruments.extractOpenRolesUrl(careersHtml),
    nationalInstruments.ORACLE_REQUISITIONS_URL,
  )
  assert.equal(nationalInstruments.hasPublicJobSignals(oracleUnavailableHtml), false)
  assert.equal(nationalInstruments.hasPublicJobSignals(publicJobsHtml), true)
  assert.equal(
    nationalInstruments.isVerifiedUnavailableOraclePage({
      status: 503,
      url: nationalInstruments.ORACLE_REQUISITIONS_URL,
      html: oracleUnavailableHtml,
    }),
    true,
  )
  assert.equal(
    nationalInstruments.isVerifiedUnavailableOraclePage({
      status: 200,
      url: nationalInstruments.ORACLE_REQUISITIONS_URL,
      html: publicJobsHtml,
    }),
    false,
  )
})

test('National Instruments sentinel returns [] only while the verified NI page and linked Oracle outage remain unchanged', async () => {
  const nationalInstruments = await loadNationalInstrumentsModule()
  const requestedUrls = []

  const jobs = await nationalInstruments.createNationalInstrumentsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === nationalInstruments.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === nationalInstruments.ORACLE_REQUISITIONS_URL) {
        return { status: 503, url, html: oracleUnavailableHtml }
      }

      if (url === nationalInstruments.LISTING_API_URL) {
        return { status: 503, url, html: oracleUnavailableHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    nationalInstruments.CAREERS_URL,
    nationalInstruments.ORACLE_REQUISITIONS_URL,
    nationalInstruments.LISTING_API_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('National Instruments sentinel fails closed when the NI handoff drifts or the linked Oracle surface becomes public again', async () => {
  const nationalInstruments = await loadNationalInstrumentsModule()

  await assert.rejects(
    nationalInstruments.createNationalInstrumentsScraper().run({
      fetchPage: async (url) => {
        if (url === nationalInstruments.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replace('/requisitions', '/jobs'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official careers page no longer matches the verified Oracle handoff/i,
  )

  await assert.rejects(
    nationalInstruments.createNationalInstrumentsScraper().run({
      fetchPage: async (url) => {
        if (url === nationalInstruments.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === nationalInstruments.ORACLE_REQUISITIONS_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        if (url === nationalInstruments.LISTING_API_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /linked Oracle requisitions page no longer matches the verified unavailable surface/i,
  )
})
