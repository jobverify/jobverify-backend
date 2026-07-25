import assert from 'node:assert/strict'
import test from 'node:test'

const loadCatalog = async () => {
  try {
    return await import('../sciomanagementsolutions/catalog.js')
  } catch {
    assert.fail('Expected SCIO Management Solutions catalog module at ../sciomanagementsolutions/catalog.js')
  }
}

const loadScript = async () => {
  try {
    return await import('../sciomanagementsolutions/script.js')
  } catch {
    assert.fail('Expected SCIO Management Solutions scraper module at ../sciomanagementsolutions/script.js')
  }
}

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at SCIO | Build a Meaningful Career in Healthcare Revenue & RCM</title>
  </head>
  <body>
    <h1>Build a Meaningful Career. Shape the Future of Healthcare Revenue.</h1>
    <p>Join a team where your talent powers better patient outcomes and stronger financial performance.</p>
    <p>Roles across Operations, Tech, Analytics, and Client Success.</p>
    <a href="https://www.scioms.com/apply-now.php">Apply Now</a>
  </body>
</html>
`

test('SCIO catalog captures the verified first-party apply-only careers shell', async () => {
  const { SCIOMS_CATALOG } = await loadCatalog()

  assert.equal(SCIOMS_CATALOG.source, 'sciomanagementsolutions')
  assert.equal(SCIOMS_CATALOG.companyName, 'SCIO Management Solutions')
  assert.equal(SCIOMS_CATALOG.companyCareerPage, 'https://www.scioms.com/careers.php')
  assert.equal(SCIOMS_CATALOG.atsPlatform, 'official-careers-shell-no-public-jobs')
  assert.equal(SCIOMS_CATALOG.countryFilter, 'India')
  assert.equal(SCIOMS_CATALOG.verifiedOn, '2026-07-18')
  assert.match(SCIOMS_CATALOG.verifiedSurfaceSummary, /apply now/i)
  assert.match(SCIOMS_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
})

test('SCIO sentinel returns [] only while the verified careers page remains apply-only', async () => {
  const scio = await loadScript()

  assert.equal(scio.hasVerifiedCareersSignal(verifiedCareersHtml), true)
  assert.equal(
    scio.hasPublicJobListingsSignal('<section><h2>Current Openings</h2><a href="/job/analyst">Revenue Cycle Analyst</a></section>'),
    true,
  )

  const jobs = await scio.run({
    fetchText: async (url) => {
      assert.equal(url, scio.CAREERS_URL)
      return verifiedCareersHtml
    },
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    scio.run({
      fetchText: async () =>
        `${verifiedCareersHtml}<section><h2>Current Openings</h2><a href="/job/analyst">Revenue Cycle Analyst</a></section>`,
    }),
    /public job listings/i,
  )
})
