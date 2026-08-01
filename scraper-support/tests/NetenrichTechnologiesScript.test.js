import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html>
  <head><title>Careers | Netenrich</title></head>
  <body>
    <h1>Careers at Netenrich</h1>
    <h2>Open Positions</h2>
    <article class="job-card">
      <h3><a href="https://netenrich.com/careers/cloud-security-architect">Cloud Security Architect</a></h3>
      <p>On-Site</p>
      <p>Hyderabad / Bhimavaram, India</p>
    </article>
    <article class="job-card">
      <h3><a href="https://netenrich.com/careers/technical-content-writer">Technical Content Writer</a></h3>
      <p>On-Site</p>
      <p>India</p>
    </article>
    <article class="job-card">
      <h3><a href="https://netenrich.com/careers/account-executive">Account Executive</a></h3>
      <p>On-Site</p>
      <p>San Jose, CA</p>
    </article>
  </body>
</html>
`

const cloudSecurityArchitectHtml = `
<!doctype html>
<html>
  <body>
    <p>We're hiring!</p>
    <h1>Cloud Security Architect</h1>
    <p>Experience: 8-12 Years Hyderabad / Bhimavaram</p>
    <h2>About Netenrich, Inc.</h2>
    <p>Netenrich delivers complete Resolution Intelligence to transform digital operations into smarter business outcomes.</p>
    <h2>Job Role:</h2>
    <p>We are looking for an experienced and hands-on Cloud Security Architect.</p>
    <h2>Requirements:</h2>
    <ul>
      <li>Wiz</li>
      <li>AWS</li>
      <li>Azure</li>
    </ul>
    <h2>Apply Now</h2>
    <p>fathima.khanam@netenrich.com</p>
  </body>
</html>
`

const technicalContentWriterHtml = `
<!doctype html>
<html>
  <body>
    <p>We're hiring!</p>
    <h1>Technical Content Writer</h1>
    <p>Experience: 4+ Years India</p>
    <h2>Job Summary</h2>
    <p>Create clear technical content for cloud and security operations audiences.</p>
    <h2>Requirements:</h2>
    <ul>
      <li>Technical writing</li>
      <li>Cyber security</li>
    </ul>
    <h2>Apply Now</h2>
    <p>jobs@netenrich.com</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/netenrichtechnologies/script.js')
  } catch {
    assert.fail('Expected Netenrich Technologies scraper module at ../../scraper/netenrichtechnologies/script.js')
  }
}

test('Netenrich Technologies extracts India jobs from the verified first-party careers page and detail pages', async () => {
  const netenrich = await loadModule()

  assert.equal(netenrich.hasOfficialCareersSignal(careersHtml), true)

  const listings = netenrich.extractListingCards(careersHtml)
  assert.deepEqual(listings, [
    {
      title: 'Cloud Security Architect',
      location: 'Hyderabad / Bhimavaram, India',
      sourceUrl: 'https://netenrich.com/careers/cloud-security-architect',
      workModel: 'On-Site',
    },
    {
      title: 'Technical Content Writer',
      location: 'India',
      sourceUrl: 'https://netenrich.com/careers/technical-content-writer',
      workModel: 'On-Site',
    },
  ])

  const detail = netenrich.extractJobDetail(cloudSecurityArchitectHtml, listings[0])
  assert.equal(detail.title, 'Cloud Security Architect')
  assert.equal(detail.location, 'Hyderabad / Bhimavaram, India')
  assert.equal(detail.city, 'Hyderabad')
  assert.equal(detail.experienceRequired, '8-12 Years')
  assert.equal(detail.applyUrl, 'mailto:fathima.khanam@netenrich.com')
  assert.deepEqual(detail.requiredSkills, ['Wiz', 'AWS', 'Azure'])
})

test('Netenrich Technologies run fetches the verified careers page and decorates shared runner fields', async () => {
  const netenrich = await loadModule()
  const requestedUrls = []

  const jobs = await netenrich.createNetenrichTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === netenrich.CAREERS_URL) return careersHtml
      if (url === 'https://netenrich.com/careers/cloud-security-architect') return cloudSecurityArchitectHtml
      if (url === 'https://netenrich.com/careers/technical-content-writer') return technicalContentWriterHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    netenrich.CAREERS_URL,
    'https://netenrich.com/careers/cloud-security-architect',
    'https://netenrich.com/careers/technical-content-writer',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'netenrichtechnologies')
  assert.equal(jobs[0].company, 'Netenrich Technologies')
  assert.equal(jobs[0].scrapedAt, '2026-07-18T00:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})

test('Netenrich Technologies fails closed when the official careers page drifts away from the verified jobs surface', async () => {
  const netenrich = await loadModule()

  await assert.rejects(
    netenrich.createNetenrichTechnologiesScraper().run({
      fetchText: async () => '<html><body>Unknown careers page</body></html>',
    }),
    /official careers page/i,
  )
})
