import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Godrej Consumer Products | Careers</title>
  </head>
  <body>
    <h1>Craft your tomorrow</h1>
    <a href="https://careers.godrejindustries.com/in/en/godrej-consumer-products-limited-gcpl-">Join us</a>

    <div class="styles_filterCard__abc FilterCard">
      <p>Job ID - <!-- -->GGXGGZINPPOS0204147ENIN</p>
      <h3>Research Scientist HI</h3>
      <p>Godrej Consumer Products Limited</p>
      <div>
        <p>Function</p>
        <p>Others</p>
      </div>
      <div>
        <p>Location</p>
        <p>Mumbai</p>
      </div>
      <div>
        <p>Required Experience</p>
        <p>10–12 years</p>
      </div>
      <div>
        <p>Posted On</p>
        <p>08/19/2024</p>
      </div>
      <div>
        <p>Job Type</p>
        <p>Full Time</p>
      </div>
      <a href="https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0204147ENIN/Research-Scientist-HI?utm_source=linkedin&utm_medium=phenom-feeds">Apply</a>
    </div>

    <div class="styles_filterCard__xyz FilterCard">
      <p>Job ID - <!-- -->GGXGGZINPPOS0211532ENIN</p>
      <h3>Manager - Analytics</h3>
      <p>Godrej Consumer Products Limited</p>
      <div>
        <p>Function</p>
        <p>Information Technology</p>
      </div>
      <div>
        <p>Location</p>
        <p>Mumbai</p>
      </div>
      <div>
        <p>Required Experience</p>
        <p>4-6 years</p>
      </div>
      <div>
        <p>Posted On</p>
        <p>02/10/2026</p>
      </div>
      <div>
        <p>Job Type</p>
        <p>Full Time</p>
      </div>
      <a href="https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0211532ENIN/Manager-Analytics?utm_source=linkedin&utm_medium=phenom-feeds">Apply</a>
    </div>
  </body>
</html>
`

const loadGodrejConsumerProductsModule = async () => {
  try {
    return await import('../../scraper/godrejconsumerproducts/script.js')
  } catch {
    assert.fail('Expected Godrej Consumer Products scraper module at ../../scraper/godrejconsumerproducts/script.js')
  }
}

test('Godrej Consumer Products script helpers stay pinned to the verified first-party careers page', async () => {
  const godrej = await loadGodrejConsumerProductsModule()

  assert.equal(godrej.SOURCE, 'godrejconsumerproducts')
  assert.equal(godrej.COMPANY, 'Godrej Consumer Products')
  assert.equal(godrej.COMPANY_DOMAIN, 'godrejcp.com')
  assert.equal(godrej.CAREERS_URL, 'https://www.godrejcp.com/careers')
  assert.equal(
    godrej.JOIN_US_URL,
    'https://careers.godrejindustries.com/in/en/godrej-consumer-products-limited-gcpl-',
  )
  assert.equal(godrej.VERIFIED_AT, '2026-07-17')
  assert.equal(godrej.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(godrej.extractJobCards(careersHtml), [
    {
      title: 'Research Scientist HI',
      company: 'Godrej Consumer Products Limited',
      requisitionId: 'GGXGGZINPPOS0204147ENIN',
      jobId: 'GGXGGZINPPOS0204147ENIN-mumbai',
      department: 'Others',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      experienceRequired: '10-12 years',
      postingDate: '2024-08-19',
      employmentType: 'Full Time',
      sourceUrl: 'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0204147ENIN/Research-Scientist-HI',
      applyUrl: 'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0204147ENIN/Research-Scientist-HI',
    },
    {
      title: 'Manager - Analytics',
      company: 'Godrej Consumer Products Limited',
      requisitionId: 'GGXGGZINPPOS0211532ENIN',
      jobId: 'GGXGGZINPPOS0211532ENIN-mumbai',
      department: 'Information Technology',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      experienceRequired: '4-6 years',
      postingDate: '2026-02-10',
      employmentType: 'Full Time',
      sourceUrl: 'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0211532ENIN/Manager-Analytics',
      applyUrl: 'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0211532ENIN/Manager-Analytics',
    },
  ])
})

test('Godrej Consumer Products run uses browser-backed first-party HTML when direct HTTP access is blocked', async () => {
  const godrej = await loadGodrejConsumerProductsModule()
  const attempts = []

  const jobs = await godrej.createGodrejConsumerProductsScraper().run({
    fetchText: async (url) => {
      attempts.push(`http:${url}`)
      throw new Error(`Connect Timeout Error for ${url}`)
    },
    fetchBrowserText: async (url) => {
      attempts.push(`browser:${url}`)
      if (url === godrej.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected browser URL: ${url}`)
    },
    now: () => '2026-07-17T05:00:00.000Z',
  })

  assert.deepEqual(attempts, [
    `http:${godrej.CAREERS_URL}`,
    `browser:${godrej.CAREERS_URL}`,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'godrejconsumerproducts')
  assert.equal(jobs[0].company, 'Godrej Consumer Products Limited')
  assert.equal(jobs[0].companyCareerPage, 'https://www.godrejcp.com/careers')
  assert.equal(jobs[0].companyDomain, 'godrejcp.com')
  assert.equal(jobs[0].atsPlatform, 'first-party-careers-page+phenom-apply-links')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-17T05:00:00.000Z')
})

test('Godrej Consumer Products fails closed when the verified first-party careers page drifts', async () => {
  const godrej = await loadGodrejConsumerProductsModule()

  await assert.rejects(
    godrej.createGodrejConsumerProductsScraper().run({
      fetchText: async () => '<html><title>Unexpected</title></html>',
      fetchBrowserText: async () => {
        throw new Error('Unexpected browser fallback')
      },
    }),
    /verified Godrej Consumer Products careers page changed materially/i,
  )
})
