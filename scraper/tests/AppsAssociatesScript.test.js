import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Apps Associates</title>
  </head>
  <body>
    <h1>Advance Your Career with an Industry Leader known for Growth and Opportunity</h1>
    <a href="https://www.appsassociates.com/current-openings">See Our Current Job Openings</a>
    <p>Which documents should be included with the online application and in which format?</p>
    <p>This will vary by country, however, guidelines are available within the application.</p>
    <p>Apps Associates offers recent graduate programs that vary by country.</p>
    <a href="https://www.appsassociates.com/current-openings">View Current Job Openings</a>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Apps Associates</title>
  </head>
  <body>
    <h1>Advance Your Career with an Industry Leader known for Growth and Opportunity</h1>
    <a href="https://www.appsassociates.com/current-openings">See Our Current Job Openings</a>
    <p>Which documents should be included with the online application and in which format?</p>
    <p>Apps Associates offers recent graduate programs that vary by country.</p>
    <p>Job Title: Oracle Consultant</p>
    <p>Location: India</p>
    <a href="https://jobs.jobvite.com/appsassociates/job/o12345">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../appsassociates/script.js')
  } catch {
    assert.fail('Expected Apps Associates scraper module at ../appsassociates/script.js')
  }
}

test('Apps Associates helpers stay pinned to the verified careers page without an inline jobs catalog', async () => {
  const apps = await loadModule()

  assert.equal(apps.SOURCE, 'appsassociates')
  assert.equal(apps.COMPANY, 'Apps Associates')
  assert.equal(apps.CAREERS_URL, 'https://appsassociates.com/careers/')
  assert.equal(apps.hasOfficialCareersSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(apps.hasPublicJobsCatalogSignal(VERIFIED_CAREERS_HTML), false)
  assert.equal(apps.hasPublicJobsCatalogSignal(PUBLIC_JOBS_HTML), true)
})

test('Apps Associates returns [] only while the verified public careers page stays catalog-free', async () => {
  const apps = await loadModule()
  const jobs = await apps.createAppsAssociatesScraper().run({
    fetchText: async (url) => {
      assert.equal(url, apps.CAREERS_URL)
      return VERIFIED_CAREERS_HTML
    },
  })

  assert.deepEqual(jobs, [])
})

test('Apps Associates fails closed when the careers page drifts or starts exposing public jobs', async () => {
  const apps = await loadModule()

  await assert.rejects(
    apps.createAppsAssociatesScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified Apps Associates careers page/i,
  )

  await assert.rejects(
    apps.createAppsAssociatesScraper().run({
      fetchText: async () => PUBLIC_JOBS_HTML,
    }),
    /public jobs catalog/i,
  )
})
