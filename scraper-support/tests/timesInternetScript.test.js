import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T18:00:00.000Z'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>JOIN US</h1>
      <a href="https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb">
        Associate Sales LOCATION: Mumbai BUSINESS: Times Ad Platform EXPERIENCE: 2 - 8 Years
      </a>
      <a href="https://timesinternet.in/careers/job-detail/644b66c280bea7e80b7a127c">
        Manager - Legal LOCATION: Noida BUSINESS: Legal EXPERIENCE: 5 - 8 Years
      </a>
      <a href="https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbc">
        Enterprise Sales Manager LOCATION: Mumbai,Noida,Bengaluru BUSINESS: Times Mobile EXPERIENCE: 3 - 12 Years
      </a>
      <p>Thanks for checking out our job openings.</p>
    </main>
  </body>
</html>
`

const associateSalesDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Associate Sales</h2>
      <h3>Mumbai</h3>
      <p>VERTICAL Times Ad Platform</p>
      <p>EXPERIENCE 2 - 8 Years</p>
      <a href="/careers/custom-job">Apply now</a>
      <h2>JOB DESCRIPTION</h2>
      <p>Job Title: Associate - Sales</p>
      <p>Location: Mumbai</p>
      <p>About Times Internet</p>
      <p>At Times Internet, we create premium digital products that simplify and enhance the lives of millions.</p>
      <p>About the Role</p>
      <p>Seeking an experienced Ad Sales Executive to join our team.</p>
      <h2>Work Responsibilities</h2>
      <p>Develop and execute sales strategies.</p>
      <p>Build and maintain strong relationships with clients.</p>
      <h2>Skills, Experience & Expertise:</h2>
      <p>Digital Advertising Knowledge</p>
      <p>Sales and Negotiation Skills</p>
      <h2>Eligibility:</h2>
      <p>Bachelor's degree in Marketing, Business Administration, or related field.</p>
    </main>
  </body>
</html>
`

const legalDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Manager - Legal</h2>
      <h3>Noida</h3>
      <p>VERTICAL Legal</p>
      <p>EXPERIENCE 5 - 8 Years</p>
      <a href="/careers/custom-job">Apply now</a>
      <h2>JOB DESCRIPTION</h2>
      <p>About Times Internet</p>
      <p>At Times Internet, we build premium digital products that simplify and enhance the everyday lives of people.</p>
      <p>About the Role</p>
      <p>The desired candidate should have 5+ years of experience.</p>
      <h2>Desired Candidate Profile</h2>
      <p>Excellent academic credentials, including a law degree.</p>
      <p>Sound knowledge of IT laws, privacy laws, and contract drafting.</p>
      <p>Educational qualification: Bachelors / Master's degree in Law</p>
    </main>
  </body>
</html>
`

const enterpriseDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Enterprise Sales Manager</h2>
      <h3>Mumbai</h3>
      <p>VERTICAL Times Mobile</p>
      <p>EXPERIENCE 3 - 12 Years</p>
      <a href="/careers/custom-job">Apply now</a>
      <h2>JOB DESCRIPTION</h2>
      <p>About Times Internet</p>
      <p>About the Role</p>
      <p>Lead enterprise sales initiatives across multiple cities.</p>
      <h2>Work Responsibilities</h2>
      <p>Drive new business growth.</p>
      <p>Manage enterprise customer relationships.</p>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/timesinternet/script.js')
  } catch {
    assert.fail('Expected Times Internet scraper module at ../../scraper/timesinternet/script.js')
  }
}

test('Times Internet helpers stay pinned to the verified first-party listing and detail page contract', async () => {
  const timesInternet = await loadModule()

  assert.equal(timesInternet.SOURCE, 'timesinternet')
  assert.equal(timesInternet.COMPANY, 'Times Internet')
  assert.equal(timesInternet.OFFICIAL_BRAND_NAME, 'Times Internet')
  assert.equal(timesInternet.CAREERS_URL, 'https://timesinternet.in/careers/job-list')
  assert.equal(timesInternet.VERIFIED_ON, '2026-07-17')
  assert.deepEqual(timesInternet.VERIFIED_JOB_DETAIL_URLS, [
    'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb',
    'https://timesinternet.in/careers/job-detail/644b66c280bea7e80b7a127c',
  ])
  assert.equal(timesInternet.hasOfficialCareersSignal(careersPageHtml), true)
  assert.deepEqual(timesInternet.extractJobCards(careersPageHtml), [
    {
      title: 'Associate Sales',
      location: 'Mumbai',
      business: 'Times Ad Platform',
      experience: '2 - 8 Years',
      detailUrl: 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb',
    },
    {
      title: 'Manager - Legal',
      location: 'Noida',
      business: 'Legal',
      experience: '5 - 8 Years',
      detailUrl: 'https://timesinternet.in/careers/job-detail/644b66c280bea7e80b7a127c',
    },
    {
      title: 'Enterprise Sales Manager',
      location: 'Mumbai,Noida,Bengaluru',
      business: 'Times Mobile',
      experience: '3 - 12 Years',
      detailUrl: 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbc',
    },
  ])
  assert.equal(timesInternet.hasOfficialJobDetailSignal(associateSalesDetailHtml), true)
  assert.deepEqual(
    timesInternet.extractJobFromDetailHtml(
      associateSalesDetailHtml,
      {
        title: 'Associate Sales',
        location: 'Mumbai',
        business: 'Times Ad Platform',
        experience: '2 - 8 Years',
        detailUrl: 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb',
      },
      { scrapedAt: FIXED_SCRAPED_AT },
    ),
    {
      title: 'Associate Sales',
      company: 'Times Internet',
      department: 'Times Ad Platform',
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '698222a358a30d19cf667cbb',
      requisitionId: '698222a358a30d19cf667cbb',
      sourceUrl: 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb',
      applyUrl: 'https://timesinternet.in/careers/custom-job',
      employmentType: null,
      experienceRequired: '2 - 8 Years',
      minimumQualification: "Bachelor's degree in Marketing, Business Administration, or related field.",
      preferredQualification: null,
      requiredSkills: [
        'Digital Advertising Knowledge',
        'Sales and Negotiation Skills',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Seeking an experienced Ad Sales Executive to join our team.',
      remoteStatus: 'On-site',
      source: 'timesinternet',
      link: 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  )
})

test('Times Internet run validates the listing page, follows same-domain detail links, and returns normalized jobs', async () => {
  const timesInternet = await loadModule()
  const requestedUrls = []

  const jobs = await timesInternet.createTimesInternetScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === timesInternet.CAREERS_URL) return careersPageHtml
      if (url === 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb') return associateSalesDetailHtml
      if (url === 'https://timesinternet.in/careers/job-detail/644b66c280bea7e80b7a127c') return legalDetailHtml
      if (url === 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbc') return enterpriseDetailHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    timesInternet.CAREERS_URL,
    'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb',
    'https://timesinternet.in/careers/job-detail/644b66c280bea7e80b7a127c',
    'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbc',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].companyCareerPage, 'https://timesinternet.in/careers/job-list')
  assert.equal(jobs[0].companyDomain, 'timesinternet.in')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[1].title, 'Manager - Legal')
  assert.equal(jobs[2].title, 'Enterprise Sales Manager')
})

test('Times Internet fails closed when the verified listing page or detail pages drift materially', async () => {
  const timesInternet = await loadModule()

  await assert.rejects(
    timesInternet.createTimesInternetScraper().run({
      fetchText: async (url) => {
        if (url === timesInternet.CAREERS_URL) return '<html><body><h1>Careers</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified Times Internet careers page/i,
  )

  await assert.rejects(
    timesInternet.createTimesInternetScraper().run({
      fetchText: async (url) => {
        if (url === timesInternet.CAREERS_URL) {
          return `
            <!doctype html>
            <html>
              <body>
                <h1>JOIN US</h1>
                <p>Associate Sales LOCATION: Mumbai BUSINESS: Times Ad Platform EXPERIENCE: 2 - 8 Years</p>
                <p>Enterprise Sales Manager</p>
                <p>Manager - Legal</p>
                <p>Thanks for checking out our job openings.</p>
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /same-domain job detail links/i,
  )

  await assert.rejects(
    timesInternet.createTimesInternetScraper().run({
      fetchText: async (url) => {
        if (url === timesInternet.CAREERS_URL) return careersPageHtml
        if (url === 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbb') {
          return '<html><body><h2>Unexpected</h2></body></html>'
        }
        if (url === 'https://timesinternet.in/careers/job-detail/644b66c280bea7e80b7a127c') return legalDetailHtml
        if (url === 'https://timesinternet.in/careers/job-detail/698222a358a30d19cf667cbc') return enterpriseDetailHtml

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified Times Internet job detail page/i,
  )
})
