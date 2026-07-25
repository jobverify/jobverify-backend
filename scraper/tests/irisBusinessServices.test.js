import assert from 'node:assert/strict'
import test from 'node:test'

const loadCatalog = async () => import('../irisbusinessservices/catalog.js')
const loadScript = async () => import('../irisbusinessservices/script.js')

const currentOpeningsHtml = `
<!doctype html>
<html>
  <head><title>Current Openings | IRIS RegTech Solutions Limited</title></head>
  <body>
    <h1>Current Openings</h1>
    <p>IRIS RegTech Solutions Limited (formerly known as IRIS Business Services Limited)</p>
    <p>Fraud Alert</p>
    <p>Send your CV to recruitments@irisbusiness.com</p>
  </body>
</html>
`

test('IRIS Business Services catalog captures the fail-closed first-party email-intake contract', async () => {
  const { IRIS_BUSINESS_SERVICES_CATALOG } = await loadCatalog()

  assert.equal(IRIS_BUSINESS_SERVICES_CATALOG.source, 'irisbusinessservices')
  assert.equal(IRIS_BUSINESS_SERVICES_CATALOG.atsPlatform, 'official-careers-page-no-public-listings')
  assert.match(IRIS_BUSINESS_SERVICES_CATALOG.verifiedSurfaceSummary, /recruitments@irisbusiness.com/i)
})

test('IRIS Business Services stays fail-closed while the first-party page is email-only', async () => {
  const iris = await loadScript()

  assert.equal(iris.hasOfficialCareersSignal(currentOpeningsHtml), true)
  assert.equal(iris.pageExposesPublicJobListings(currentOpeningsHtml), false)
  assert.deepEqual(await iris.run({ fetchText: async () => currentOpeningsHtml }), [])

  await assert.rejects(
    iris.run({
      fetchText: async () => '<html><body><a href="/jobdetails/123">Apply now</a></body></html>',
    }),
    /verified iris current openings page/i,
  )
})
