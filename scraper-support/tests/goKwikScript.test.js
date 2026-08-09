import assert from 'node:assert/strict'
import test from 'node:test'

const aboutPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>GoKwik - Smart Checkout & RTO Solutions for D2C Brands</title>
  </head>
  <body>
    <main>
      <h1>We Are GoKwik</h1>
      <p>GoKwik is a D2C commerce growth platform that helps brands drive revenue across the entire customer lifecycle.</p>
      <section>
        <h2>Life at GoKwik</h2>
        <a href="https://gokwik.keka.com/careers">JOIN OUR TEAM</a>
      </section>
      <footer>
        <p>Founded in 2020, GoKwik is an enabler focusing predominantly on unlocking growth for E-Commerce brands.</p>
        <p>GoKwik Commerce solutions private limited is not a payment aggregator.</p>
        <nav>
          <a href="/about">About</a>
          <a href="https://gokwik.keka.com/careers">Careers</a>
        </nav>
        <p>Trusted. Certified. Secure.</p>
        <p>© 2026 GoKwik. All rights reserved.</p>
      </footer>
    </main>
  </body>
</html>
`

const currentAboutPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>GoKwik - Smart Checkout &amp; RTO Solutions for D2C Brands</title>
  </head>
  <body>
    <main>
      <h1>We Are GoKwik</h1>
      <p>GoKwik is a D2C commerce growth platform that helps brands drive revenue across the entire customer lifecycle.</p>
      <section>
        <h2>Life at GoKwik</h2>
        <a href="https://gokwik.keka.com/careers/">JOIN OUR TEAM</a>
      </section>
      <footer>
        <p>GoKwik Commerce solutions private limited is not a payment aggregator.</p>
        <nav>
          <a href="https://gokwik.keka.com/careers/">Careers</a>
        </nav>
        <p>Trusted. Certified. Secure.</p>
      </footer>
    </main>
  </body>
</html>
`

const portalInfo = {
  name: 'GoKwik Commerce Solutions Pvt. Ltd.',
  shortName: 'GoKwik Commerce Solutions Pvt. Ltd.',
  careersPortalDomain: 'gokwik.keka.com',
  companyWebsite: 'https://www.gokwik.co/',
  fontFamily: 'Montserrat',
  jobListingSetting: {
    filters: ['department', 'location'],
    jobFields: ['location', 'experience', 'jobType'],
    jobListingFormat: 1,
  },
}

const departments = [
  { id: 32377, identifier: 'e62d0a0d-b1d8-44ae-ac3c-7f6d00ebb8e7', name: 'Engineering' },
  { id: 32380, identifier: 'adb7a588-071c-4780-bb9b-7d3d0d8af641', name: 'Sales' },
]

const activeJobs = [
  {
    id: 129201,
    title: 'Senior DevOps Engineer',
    description: '<p>Lead SRE practices and improve incident response across production systems.</p>',
    departmentIdentifier: 'e62d0a0d-b1d8-44ae-ac3c-7f6d00ebb8e7',
    jobLocations: [
      { name: 'Gurgaon', city: 'Gurugram', state: 'HR', countryCode: 'IN', countryName: 'India' },
    ],
    jobType: 2,
    experience: '5 - 8 Years',
    jobNumber: 'GK-REQ-00406',
    salaryRangeFormat: 'INR 25,00,000.00 - 35,00,000.00',
    publishedOn: '2026-06-02T12:45:43.373Z',
    skillNames: ['Kubernetes', 'Terraform'],
  },
  {
    id: 190001,
    title: 'US Sales Manager',
    departmentIdentifier: 'adb7a588-071c-4780-bb9b-7d3d0d8af641',
    jobLocations: [
      { name: 'New York', city: 'New York', state: 'NY', countryCode: 'US', countryName: 'United States' },
    ],
    jobType: 2,
    experience: '5 - 7 Years',
    jobNumber: 'GK-REQ-00999',
    publishedOn: '2026-07-16T09:00:00.000Z',
  },
]

const loadModule = async () => {
  try {
    return await import('../../scraper/gokwik/script.js')
  } catch {
    assert.fail('Expected GoKwik scraper module at ../../scraper/gokwik/script.js')
  }
}

test('GoKwik helpers stay pinned to the verified first-party careers handoff and Keka contract', async () => {
  const gokwik = await loadModule()

  assert.equal(gokwik.SOURCE, 'gokwik')
  assert.equal(gokwik.COMPANY, 'GoKwik')
  assert.equal(gokwik.ABOUT_PAGE_URL, 'https://www.gokwik.co/about?_gc=1')
  assert.equal(gokwik.CAREERS_URL, 'https://gokwik.keka.com/careers')
  assert.equal(
    gokwik.CAREER_PORTAL_INFO_URL,
    'https://gokwik.keka.com/careers/api/organization/default/careerportalinfo',
  )
  assert.equal(
    gokwik.ACTIVE_JOBS_URL,
    'https://gokwik.keka.com/careers/api/embedjobs/default/active/19d678f6-8b79-4532-a5f0-d57b593a822e',
  )
  assert.equal(
    gokwik.DEPARTMENTS_URL,
    'https://gokwik.keka.com/careers/api/embedjobs/departments/19d678f6-8b79-4532-a5f0-d57b593a822e',
  )
  assert.equal(gokwik.EXPECTED_IDENTIFIER, '19d678f6-8b79-4532-a5f0-d57b593a822e')
  assert.equal(gokwik.EXPECTED_KEKA_DOMAIN, 'https://gokwik.keka.com/careers/')
  assert.equal(gokwik.VERIFIED_ON, '2026-07-16')
  assert.equal(gokwik.extractCareersUrlFromAboutPage(aboutPageHtml), gokwik.CAREERS_URL)
  assert.equal(gokwik.hasOfficialAboutPageSignal(aboutPageHtml), true)
  assert.equal(gokwik.hasOfficialAboutPageSignal(currentAboutPageHtml), true)
  assert.equal(gokwik.hasExpectedCareerPortalInfo(portalInfo), true)
})

test('GoKwik returns only India jobs from the verified Keka active-jobs feed', async () => {
  const gokwik = await loadModule()
  const requestedPages = []
  const requestedJson = []

  const jobs = await gokwik.createGoKwikScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)
      if (url === gokwik.ABOUT_PAGE_URL) {
        return { status: 200, url, html: aboutPageHtml }
      }
      throw new Error(`Unexpected GoKwik page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === gokwik.CAREER_PORTAL_INFO_URL) {
        return { status: 200, url, json: portalInfo }
      }
      if (url === gokwik.ACTIVE_JOBS_URL) {
        return { status: 200, url, json: activeJobs }
      }
      if (url === gokwik.DEPARTMENTS_URL) {
        return { status: 200, url, json: departments }
      }
      throw new Error(`Unexpected GoKwik JSON URL: ${url}`)
    },
    now: () => '2026-07-16T18:45:00.000Z',
  })

  assert.deepEqual(requestedPages, [gokwik.ABOUT_PAGE_URL])
  assert.deepEqual(requestedJson, [
    gokwik.CAREER_PORTAL_INFO_URL,
    gokwik.ACTIVE_JOBS_URL,
    gokwik.DEPARTMENTS_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior DevOps Engineer',
    company: 'GoKwik',
    department: 'Engineering',
    location: 'Gurugram, India',
    city: 'Gurugram',
    country: 'India',
    jobId: '129201',
    requisitionId: 'GK-REQ-00406',
    sourceUrl: 'https://gokwik.keka.com/careers/jobdetails/129201',
    applyUrl: 'https://gokwik.keka.com/careers/applyjob/129201',
    employmentType: 'Full Time',
    experienceRequired: '5 - 8 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Kubernetes', 'Terraform'],
    postingDate: '2026-06-02',
    closingDate: null,
    jobDescription: 'Lead SRE practices and improve incident response across production systems.',
    remoteStatus: 'On-site',
    compensation: 'INR 25,00,000.00 - 35,00,000.00',
    source: 'gokwik',
    link: 'https://gokwik.keka.com/careers/applyjob/129201',
    scrapedAt: '2026-07-16T18:45:00.000Z',
  })
})

test('GoKwik fails closed when the about page, careers link, portal info, or active feed drift', async () => {
  const gokwik = await loadModule()

  await assert.rejects(
    gokwik.run({
      fetchPage: async () => ({ status: 200, url: gokwik.ABOUT_PAGE_URL, html: '<html><body>Different</body></html>' }),
      fetchJson: async () => ({ status: 200, url: gokwik.CAREER_PORTAL_INFO_URL, json: portalInfo }),
    }),
    /verified about page/i,
  )

  await assert.rejects(
    gokwik.run({
      fetchPage: async () => ({
        status: 200,
        url: gokwik.ABOUT_PAGE_URL,
        html: aboutPageHtml.replace('https://gokwik.keka.com/careers', 'https://jobs.example.com/gokwik'),
      }),
      fetchJson: async () => ({ status: 200, url: gokwik.CAREER_PORTAL_INFO_URL, json: portalInfo }),
    }),
    /careers handoff/i,
  )

  await assert.rejects(
    gokwik.run({
      fetchPage: async () => ({ status: 200, url: gokwik.ABOUT_PAGE_URL, html: aboutPageHtml }),
      fetchJson: async (url) => {
        if (url === gokwik.CAREER_PORTAL_INFO_URL) {
          return {
            status: 200,
            url,
            json: { ...portalInfo, careersPortalDomain: 'jobs.example.com' },
          }
        }
        if (url === gokwik.ACTIVE_JOBS_URL) {
          return { status: 200, url, json: activeJobs }
        }
        return { status: 200, url, json: departments }
      },
    }),
    /career portal info/i,
  )

  await assert.rejects(
    gokwik.run({
      fetchPage: async () => ({ status: 200, url: gokwik.ABOUT_PAGE_URL, html: aboutPageHtml }),
      fetchJson: async (url) => {
        if (url === gokwik.CAREER_PORTAL_INFO_URL) {
          return { status: 200, url, json: portalInfo }
        }
        if (url === gokwik.ACTIVE_JOBS_URL) {
          return { status: 200, url, json: { data: activeJobs } }
        }
        return { status: 200, url, json: departments }
      },
    }),
    /active jobs feed/i,
  )
})
