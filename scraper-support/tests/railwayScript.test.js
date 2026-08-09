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
      <p>See open positions</p>
      <a href="/careers/orchestration-baremetal">
        <p>Senior Infra Engineer: Baremetal Orchestration</p>
        <p>Anywhere</p>
      </a>
      <a href="/careers/dc-engineer">
        <p>Senior Infra Engineer: Datacenters</p>
        <p>Anywhere</p>
      </a>
      <a href="/careers/scalability">
        <p>Senior Product Engineer: Scalability</p>
        <p>Anywhere</p>
      </a>
    </main>
  </body>
</html>
`

const loadRailwayModule = async () => {
  try {
    return await import('../../scraper/railway/script.js')
  } catch {
    assert.fail('Expected Railway scraper module at ../../scraper/railway/script.js')
  }
}

test('Railway pins the verified first-party careers page and same-domain role links', async () => {
  const railway = await loadRailwayModule()

  assert.equal(railway.SOURCE, 'railway')
  assert.equal(railway.COMPANY, 'Railway')
  assert.equal(railway.COMPANY_DOMAIN, 'railway.com')
  assert.equal(railway.CAREERS_URL, 'https://railway.com/careers')
  assert.equal(railway.VERIFIED_AT, '2026-08-04')
  assert.equal(railway.hasVerifiedCareersPageSignal(careersHtml), true)
  assert.deepEqual(railway.extractRoleSummaries(careersHtml), [
    {
      title: 'Senior Infra Engineer: Baremetal Orchestration',
      location: 'Anywhere',
      url: 'https://railway.com/careers/orchestration-baremetal',
    },
    {
      title: 'Senior Infra Engineer: Datacenters',
      location: 'Anywhere',
      url: 'https://railway.com/careers/dc-engineer',
    },
    {
      title: 'Senior Product Engineer: Scalability',
      location: 'Anywhere',
      url: 'https://railway.com/careers/scalability',
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
      fetchText: async () => careersHtml.replace('Anywhere', 'Bengaluru, India'),
    }),
    /india slice/i,
  )
})
