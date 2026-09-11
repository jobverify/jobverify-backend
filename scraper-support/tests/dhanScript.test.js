import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Dhan - Online Stock Trading and Investing Platform for India</title>
    <link rel="canonical" href="https://dhan.co/" />
  </head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/career/">Careers</a>
    </nav>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Work with us and Help us Raise The Bar | Dhan</title>
    <link rel="canonical" href="https://dhan.co/career/" />
    <meta property="og:url" content="https://dhan.co/career/" />
  </head>
  <body>
    <main>
      <h1>Come work with us</h1>
      <p>Raise is a team of 550+ and hiring more.</p>
      <p>Apply now!</p>
      <a href="https://www.linkedin.com/company/raise-financial-services/jobs/">Explore on Linkedin</a>
      <a href="https://dhan.keka.com/careers/">Explore Careers at Raise</a>
    </main>
  </body>
</html>
`

const jobsPayload = [{
  id: 73365,
  title: 'Product & Growth Marketing - fuzz (Raise AI)',
  departmentName: 'Design',
  jobLocations: [{
    name: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    countryCode: 'IN',
    countryName: 'India',
  }],
  jobType: 2,
  experience: '3-5 years',
  skillNames: ['Growth Marketing'],
  publishedOn: '2026-09-03',
  description: '<p>Help Raise grow its investing products.</p>',
}]

const loadDhanModule = async () => {
  try {
    return await import('../../scraper/dhan/script.js')
  } catch {
    assert.fail('Expected Dhan scraper module at ../../scraper/dhan/script.js')
  }
}

test('Dhan scraper constants and helpers stay pinned to the verified first-party and Keka surfaces', async () => {
  const dhan = await loadDhanModule()

  assert.equal(dhan.SOURCE, 'dhan')
  assert.equal(dhan.COMPANY, 'Dhan')
  assert.equal(dhan.OFFICIAL_BRAND_NAME, 'Dhan')
  assert.equal(dhan.VERIFIED_ON, '2026-09-03')
  assert.equal(dhan.HOMEPAGE_URL, 'https://dhan.co/')
  assert.equal(dhan.CAREERS_URL, 'https://dhan.co/career/')
  assert.equal(dhan.CAREERS_HANDOFF_URL, 'https://dhan.keka.com/careers/')
  assert.equal(dhan.CAREERS_CONFIG_URL, null)
  assert.equal(dhan.CAREERS_FILTER_PARAMS_URL, null)
  assert.equal(
    dhan.JOBS_API_URL,
    'https://dhan.keka.com/careers/api/embedjobs/default/active/7669ff3a-2b35-4442-9bac-9f9ae4b718b3',
  )
  assert.match(dhan.VERIFIED_SURFACE_SUMMARY, /https:\/\/dhan\.co\/career\//i)
  assert.equal(dhan.KEKA_JOBS_API_URL, dhan.JOBS_API_URL)
  assert.equal(dhan.KEKA_JOB_DETAILS_URL, 'https://dhan.keka.com/careers/jobdetails/')
  assert.equal(dhan.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(dhan.extractHomepageCareerUrl(homepageHtml), 'https://dhan.co/career/')
  assert.equal(dhan.hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(dhan.extractOfficialCareersHandoffUrl(careersHtml), 'https://dhan.keka.com/careers/')

  const job = dhan.normalizeKekaJob(jobsPayload[0])
  assert.ok(job)
  assert.equal(job.title, 'Product & Growth Marketing - fuzz (Raise AI)')
  assert.equal(job.company, 'Dhan')
  assert.equal(job.department, 'Design')
  assert.equal(job.location, 'Mumbai, Maharashtra, India')
  assert.equal(job.city, 'Mumbai')
  assert.equal(job.country, 'India')
  assert.equal(job.jobId, 'dhan-73365')
  assert.equal(job.requisitionId, '73365')
  assert.equal(job.sourceUrl, 'https://dhan.keka.com/careers/jobdetails/73365')
  assert.equal(job.applyUrl, 'https://dhan.keka.com/careers/jobdetails/73365')
  assert.equal(job.employmentType, 'Full-time')
  assert.equal(job.experienceRequired, '3-5 years')
  assert.equal(job.postingDate, '2026-09-03')
  assert.deepEqual(job.requiredSkills, ['Growth Marketing'])
  assert.match(job.jobDescription, /Help Raise grow/i)
})

test('Dhan run validates the verified first-party handoff and returns normalized Keka jobs', async () => {
  const dhan = await loadDhanModule()
  const requestedPageUrls = []
  const requestedJsonUrls = []

  const jobs = await dhan.createDhanScraper({
    now: () => '2026-09-03T12:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPageUrls.push(url)

      if (url === dhan.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === dhan.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected Dhan page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)

      if (url === dhan.JOBS_API_URL) return jobsPayload

      throw new Error(`Unexpected Dhan JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPageUrls, [
    'https://dhan.co/',
    'https://dhan.co/career/',
  ])
  assert.deepEqual(requestedJsonUrls, [
    'https://dhan.keka.com/careers/api/embedjobs/default/active/7669ff3a-2b35-4442-9bac-9f9ae4b718b3',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Product & Growth Marketing - fuzz (Raise AI)')
  assert.equal(jobs[0].companyDomain, 'dhan.co')
  assert.equal(jobs[0].atsPlatform, 'keka')
  assert.equal(jobs[0].companyCareerPage, 'https://dhan.co/career/')
  assert.equal(jobs[0].link, 'https://dhan.keka.com/careers/jobdetails/73365')
  assert.equal(jobs[0].scrapedAt, '2026-09-03T12:00:00.000Z')
})

test('Dhan returns [] when the verified Keka jobs feed has no active India roles', async () => {
  const dhan = await loadDhanModule()

  const jobs = await dhan.createDhanScraper().run({
    fetchPage: async (url) => {
      if (url === dhan.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === dhan.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected Dhan page URL: ${url}`)
    },
    fetchJson: async (url) => {
      if (url === dhan.JOBS_API_URL) return []

      throw new Error(`Unexpected Dhan JSON URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Dhan fails closed when the verified first-party handoff or Keka payloads drift', async () => {
  const dhan = await loadDhanModule()

  await assert.rejects(
    dhan.createDhanScraper().run({
      fetchPage: async (url) => {
        if (url === dhan.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected Dhan page URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    dhan.createDhanScraper().run({
      fetchPage: async (url) => {
        if (url === dhan.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === dhan.CAREERS_URL) {
          return { status: 200, url, html: '<html><title>Broken</title></html>' }
        }

        throw new Error(`Unexpected Dhan page URL: ${url}`)
      },
    }),
    /careers page/i,
  )

  await assert.rejects(
    dhan.createDhanScraper().run({
      fetchPage: async (url) => {
        if (url === dhan.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === dhan.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        throw new Error(`Unexpected Dhan page URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === dhan.JOBS_API_URL) return { jobs: [] }

        throw new Error(`Unexpected Dhan JSON URL: ${url}`)
      },
    }),
    /Keka jobs API/i,
  )

  await assert.rejects(
    dhan.createDhanScraper().run({
      fetchPage: async (url) => {
        if (url === dhan.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === dhan.CAREERS_URL) return { status: 200, url, html: careersHtml }
        throw new Error(`Unexpected Dhan page URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === dhan.JOBS_API_URL) return [{ id: 73365, title: 'Unexpected location', jobLocations: [] }]

        throw new Error(`Unexpected Dhan JSON URL: ${url}`)
      },
    }),
    /no longer produces India jobs/i,
  )
})
