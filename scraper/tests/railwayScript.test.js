import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Railway</title>
  </head>
  <body>
    <main>
      <h1>Redefine the future of infrastructure</h1>
      <a href="/careers/developer-relations">Senior DevRel Engineer - Product</a>
      <span>Remote (anywhere)</span>
      <a href="/careers/growth">Senior DevRel Engineer - Growth</a>
      <span>Remote (anywhere)</span>
      <a href="/careers/product-engineer">Senior Full-Stack Engineer - Product</a>
      <span>Remote</span>
    </main>
  </body>
</html>
`

const loadRailwayModule = async () => {
  try {
    return await import('../railway/script.js')
  } catch {
    assert.fail('Expected Railway scraper module at ../railway/script.js')
  }
}

test('Railway pins the verified first-party careers page and same-domain role links', async () => {
  const railway = await loadRailwayModule()

  assert.equal(railway.SOURCE, 'railway')
  assert.equal(railway.COMPANY, 'Railway')
  assert.equal(railway.COMPANY_DOMAIN, 'railway.com')
  assert.equal(railway.CAREERS_URL, 'https://railway.com/careers?mdrv=railway.com')
  assert.equal(railway.VERIFIED_AT, '2026-07-25')
  assert.equal(railway.hasVerifiedCareersPageSignal(careersHtml), true)
  assert.deepEqual(railway.extractRoleSummaries(careersHtml), [
    {
      title: 'Senior DevRel Engineer - Product',
      location: 'Remote (anywhere)',
      url: 'https://railway.com/careers/developer-relations',
    },
    {
      title: 'Senior DevRel Engineer - Growth',
      location: 'Remote (anywhere)',
      url: 'https://railway.com/careers/growth',
    },
    {
      title: 'Senior Full-Stack Engineer - Product',
      location: 'Remote',
      url: 'https://railway.com/careers/product-engineer',
    },
  ])
})

test('Railway returns an honest empty array while the verified first-party roles stay outside India', async () => {
  const railway = await loadRailwayModule()
  const requestedUrls = []

  const jobs = await railway.createRailwayScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [railway.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Railway fails closed when the verified careers surface drifts or the India slice changes', async () => {
  const railway = await loadRailwayModule()

  await assert.rejects(
    railway.createRailwayScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
    }),
    /careers page/i,
  )

  await assert.rejects(
    railway.createRailwayScraper().run({
      fetchText: async () => careersHtml.replace('Remote (anywhere)', 'Bengaluru, India'),
    }),
    /india slice/i,
  )
})
