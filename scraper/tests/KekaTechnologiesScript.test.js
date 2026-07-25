import assert from 'node:assert/strict'
import test from 'node:test'

const careersLandingHtml = `
<!doctype html>
<html>
  <body>
    <h1>Life is too short to do mediocre work</h1>
    <h2>Join Our Team</h2>
    <a href="https://hr.keka.com/careers">View all Job openings</a>
  </body>
</html>
`

const productRolesHtml = `
<!doctype html>
<html>
  <body>
    <h1>Product Managers across all levels</h1>
    <p>We have multiple open positions for product roles across all levels - from Associate Product Manager, Product Manager, all the way up to Senior Product Manager.</p>
    <p>Apply Now</p>
    <a href="https://hr.keka.com/careers/jobdetails/101">Associate Product Manager 1-2 years of experience</a>
    <a href="https://hr.keka.com/careers/jobdetails/102">Product Manager 4-8 years of experience</a>
    <a href="https://hr.kekahire.com/careers/jobdetails/103">Product Leadership 8+ years of experience</a>
  </body>
</html>
`

const designRolesHtml = `
<!doctype html>
<html>
  <body>
    <h1>We are hiring for all Product Design roles</h1>
    <p>Your next step, apply!</p>
    <a href="https://hr.keka.com/careers/jobdetails/201">Manager Product Designer 10+ years of experience Hyderabad</a>
    <a href="https://hr.keka.com/careers/jobdetails/202">Staff Product Designer 8+ years of experience Hyderabad</a>
    <a href="https://hr.kekahire.com/careers/jobdetails/203">Lead Product Designer 6+ years of experience Hyderabad</a>
  </body>
</html>
`

const marketingRolesHtml = `
<!doctype html>
<html>
  <body>
    <h1>All levels of SaaS Marketing roles</h1>
    <p>Job openings</p>
    <a href="https://hr.kekahire.com/careers/jobdetails/301">Growth Marketer Hyderabad</a>
    <a href="https://hr.kekahire.com/careers/jobdetails/302">Head - Content Marketing Hyderabad</a>
    <a href="https://hr.kekahire.com/careers/jobdetails/303">Product Marketing Manager Hyderabad</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../kekatechnologies/script.js')
  } catch {
    assert.fail('Expected KEKA TECHNOLOGIES scraper module at ../kekatechnologies/script.js')
  }
}

test('KEKA TECHNOLOGIES extracts role listings from the verified first-party Keka role pages', async () => {
  const keka = await loadModule()

  assert.equal(keka.hasOfficialCareersLandingSignal(careersLandingHtml), true)

  assert.deepEqual(keka.extractRoleListings(productRolesHtml, 'https://www.keka.com/careers/product-manager'), [
    {
      title: 'Associate Product Manager',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      experienceRequired: '1-2 years of experience',
      applyUrl: 'https://hr.keka.com/careers/jobdetails/101',
      sourceUrl: 'https://www.keka.com/careers/product-manager',
    },
    {
      title: 'Product Manager',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      experienceRequired: '4-8 years of experience',
      applyUrl: 'https://hr.keka.com/careers/jobdetails/102',
      sourceUrl: 'https://www.keka.com/careers/product-manager',
    },
    {
      title: 'Product Leadership',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      experienceRequired: '8+ years of experience',
      applyUrl: 'https://hr.kekahire.com/careers/jobdetails/103',
      sourceUrl: 'https://www.keka.com/careers/product-manager',
    },
  ])
})

test('KEKA TECHNOLOGIES run fetches the verified landing and curated role pages, then decorates shared fields', async () => {
  const keka = await loadModule()
  const requestedUrls = []

  const jobs = await keka.createKekaTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === keka.CAREERS_URL) return careersLandingHtml
      if (url === 'https://www.keka.com/careers/product-manager') return productRolesHtml
      if (url === 'https://www.keka.com/careers/design-roles') return designRolesHtml
      if (url === 'https://www.keka.com/marketing-roles') return marketingRolesHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    keka.CAREERS_URL,
    'https://www.keka.com/careers/product-manager',
    'https://www.keka.com/careers/design-roles',
    'https://www.keka.com/marketing-roles',
  ])
  assert.equal(jobs.length, 9)
  assert.equal(jobs[0].company, 'KEKA TECHNOLOGIES')
  assert.equal(jobs[0].source, 'kekatechnologies')
  assert.equal(jobs[0].scrapedAt, '2026-07-18T00:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})

test('KEKA TECHNOLOGIES fails closed when the official careers landing loses the verified job handoff', async () => {
  const keka = await loadModule()

  await assert.rejects(
    keka.createKekaTechnologiesScraper().run({
      fetchText: async () => '<html><body>No hiring signal</body></html>',
    }),
    /official careers landing/i,
  )
})
