import assert from 'node:assert/strict'
import test from 'node:test'

const loadNestDigitalModule = async () => {
  try {
    return await import('../nestdigital/script.js')
  } catch {
    assert.fail('Expected NeST Digital scraper module at ../nestdigital/script.js')
  }
}

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <section>
        <h1>Give Wings to your dreams at NeST Digital!</h1>
        <a href="https://careers.nestdigital.com/">EXPLORE NOW</a>
      </section>

      <section>
        <h2>Latest Jobs</h2>
        <a href="https://careers.nestdigital.com/jobs/senior-software-developer-ios-application-development">
          Senior Software Developer-IOS Application Development
          <span>Chennai-TAMIL NADU</span>
          <span>Full Time</span>
        </a>
        <a href="https://careers.nestdigital.com/jobs/senior-software-engineer-firmware-engineer">
          Senior Software Engineer- Firmware Engineer
          <span>Pune-Maharashtra</span>
          <span>Full Time</span>
        </a>
        <a href="https://careers.nestdigital.com/jobs/senior-systems-engineer-it">
          Senior Systems Engineer - IT
          <span>Chennai-TAMIL NADU</span>
          <span>Contract</span>
        </a>
      </section>
    </main>
  </body>
</html>
`

test('NeST Digital scraper recognizes the verified official careers page and extracts inline latest-job cards', async () => {
  const nestDigital = await loadNestDigitalModule()

  assert.equal(nestDigital.SOURCE, 'nestdigital')
  assert.equal(nestDigital.COMPANY, 'NeST Digital')
  assert.equal(nestDigital.CAREERS_URL, 'https://nestdigital.com/career/')
  assert.equal(nestDigital.JOBS_HOST_URL, 'https://careers.nestdigital.com/')
  assert.equal(nestDigital.hasOfficialCareersSignal(careersPageHtml), true)

  assert.deepEqual(nestDigital.extractLatestJobs(careersPageHtml), [
    {
      title: 'Senior Software Developer-IOS Application Development',
      location: 'Chennai, Tamil Nadu, India',
      city: 'Chennai',
      employmentType: 'Full Time',
      sourceUrl: 'https://careers.nestdigital.com/jobs/senior-software-developer-ios-application-development',
      applyUrl: 'https://careers.nestdigital.com/jobs/senior-software-developer-ios-application-development',
    },
    {
      title: 'Senior Software Engineer- Firmware Engineer',
      location: 'Pune, Maharashtra, India',
      city: 'Pune',
      employmentType: 'Full Time',
      sourceUrl: 'https://careers.nestdigital.com/jobs/senior-software-engineer-firmware-engineer',
      applyUrl: 'https://careers.nestdigital.com/jobs/senior-software-engineer-firmware-engineer',
    },
    {
      title: 'Senior Systems Engineer - IT',
      location: 'Chennai, Tamil Nadu, India',
      city: 'Chennai',
      employmentType: 'Contract',
      sourceUrl: 'https://careers.nestdigital.com/jobs/senior-systems-engineer-it',
      applyUrl: 'https://careers.nestdigital.com/jobs/senior-systems-engineer-it',
    },
  ])
})

test('run validates the official NeST Digital careers page and decorates public jobs', async () => {
  const nestDigital = await loadNestDigitalModule()

  const requestedUrls = []
  const jobs = await nestDigital.createNestDigitalScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === nestDigital.CAREERS_URL) return careersPageHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [nestDigital.CAREERS_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].company, 'NeST Digital')
  assert.equal(jobs[0].source, 'nestdigital')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
  assert.notEqual(jobs[0].jobId, jobs[1].jobId)
})

test('run fails closed when the verified NeST Digital latest-jobs section disappears', async () => {
  const nestDigital = await loadNestDigitalModule()

  await assert.rejects(
    nestDigital.createNestDigitalScraper().run({
      fetchText: async () => `
        <html>
          <body>
            <main>
              <h1>Give Wings to your dreams at NeST Digital!</h1>
              <p>Shape our Future Together!</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official public careers surface/i,
  )
})
