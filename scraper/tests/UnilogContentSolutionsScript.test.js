import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Unilog</title>
  </head>
  <body>
    <section>
      <h1>Build What’s Next in B2B Commerce. Together.</h1>
      <h2>Open Roles</h2>
      <article class="job-role-card">
        <a href="https://www.unilogcorp.com/careers/java-software-developer-cx1-platform/">
          <h3>Java Software Developer (CX1 Platform)</h3>
        </a>
        <p>Full Time</p>
        <p>Bangalore</p>
        <p>Mysore</p>
        <p>Remote</p>
      </article>
      <article class="job-role-card">
        <a href="https://www.unilogcorp.com/careers/software-test-engineer-accelq-selenium-python/">
          <h3>Software Test Engineer – AccelQ & Selenium/Python (Ecomm Domain)</h3>
        </a>
        <p>Full Time</p>
        <p>Mysore/Bangalore/Remote</p>
      </article>
      <article class="job-role-card">
        <a href="https://www.unilogcorp.com/careers/account-executive-us/">
          <h3>Account Executive</h3>
        </a>
        <p>Full Time</p>
        <p>Philadelphia, PA</p>
      </article>
    </section>
  </body>
</html>
`

const loadUnilogModule = async () => {
  try {
    return await import('../unilogcontentsolutions/script.js')
  } catch {
    assert.fail('Expected Unilog Content Solutions scraper module at ../unilogcontentsolutions/script.js')
  }
}

test('Unilog Content Solutions helpers stay pinned to the verified HTML open roles surface', async () => {
  const unilog = await loadUnilogModule()

  assert.equal(unilog.SOURCE, 'unilogcontentsolutions')
  assert.equal(unilog.COMPANY_NAME, 'Unilog Content Solutions ( P)')
  assert.equal(unilog.OFFICIAL_BRAND_NAME, 'Unilog')
  assert.equal(unilog.VERIFIED_ON, '2026-07-17')
  assert.equal(unilog.OFFICIAL_CAREERS_URL, 'https://www.unilogcorp.com/careers/')
  assert.equal(unilog.hasOfficialUnilogCareersSignals(verifiedCareersHtml), true)
  assert.equal(
    unilog.hasOfficialUnilogCareersSignals(verifiedCareersHtml.replace('Open Roles', 'Jobs')),
    false,
  )
  assert.deepEqual(unilog.extractVisibleRoleCards(verifiedCareersHtml), [
    {
      title: 'Java Software Developer (CX1 Platform)',
      location: 'Bangalore / Mysore / Remote',
      cities: ['Bangalore', 'Mysore'],
      country: 'India',
      sourceUrl: 'https://www.unilogcorp.com/careers/java-software-developer-cx1-platform/',
      applyUrl: 'https://www.unilogcorp.com/careers/java-software-developer-cx1-platform/',
      employmentType: 'Full Time',
      jobId: 'java-software-developer-cx1-platform',
    },
    {
      title: 'Software Test Engineer – AccelQ & Selenium/Python (Ecomm Domain)',
      location: 'Mysore/Bangalore/Remote',
      cities: ['Mysore', 'Bangalore'],
      country: 'India',
      sourceUrl: 'https://www.unilogcorp.com/careers/software-test-engineer-accelq-selenium-python/',
      applyUrl: 'https://www.unilogcorp.com/careers/software-test-engineer-accelq-selenium-python/',
      employmentType: 'Full Time',
      jobId: 'software-test-engineer-accelq-selenium-python',
    },
  ])
})

test('Unilog Content Solutions run validates the official careers page before returning visible India jobs', async () => {
  const { createUnilogContentSolutionsScraper } = await loadUnilogModule()
  const scraper = createUnilogContentSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  const jobs = await scraper.run({
    fetchText: async () => verifiedCareersHtml,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Java Software Developer (CX1 Platform)',
      company: 'Unilog Content Solutions ( P)',
      department: null,
      location: 'Bangalore / Mysore / Remote',
      city: 'Bangalore',
      country: 'India',
      jobId: 'java-software-developer-cx1-platform',
      requisitionId: null,
      sourceUrl: 'https://www.unilogcorp.com/careers/java-software-developer-cx1-platform/',
      applyUrl: 'https://www.unilogcorp.com/careers/java-software-developer-cx1-platform/',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      source: 'unilogcontentsolutions',
      link: 'https://www.unilogcorp.com/careers/java-software-developer-cx1-platform/',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Software Test Engineer – AccelQ & Selenium/Python (Ecomm Domain)',
      company: 'Unilog Content Solutions ( P)',
      department: null,
      location: 'Mysore/Bangalore/Remote',
      city: 'Mysore',
      country: 'India',
      jobId: 'software-test-engineer-accelq-selenium-python',
      requisitionId: null,
      sourceUrl: 'https://www.unilogcorp.com/careers/software-test-engineer-accelq-selenium-python/',
      applyUrl: 'https://www.unilogcorp.com/careers/software-test-engineer-accelq-selenium-python/',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      source: 'unilogcontentsolutions',
      link: 'https://www.unilogcorp.com/careers/software-test-engineer-accelq-selenium-python/',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Unilog Content Solutions fails closed when the verified first-party careers page drifts', async () => {
  const { createUnilogContentSolutionsScraper } = await loadUnilogModule()
  const scraper = createUnilogContentSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => verifiedCareersHtml.replace('Build What’s Next in B2B Commerce. Together.', 'Join Our Team'),
    }),
    /verified official careers page/i,
  )
})
