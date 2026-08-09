import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'webandcrafts',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')
const readJsonFixture = (name) => JSON.parse(readFixture(name))

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')
const jobsIndexHtml = readFixture('job-openings.html')
const digitalMarketingPayload = readJsonFixture('digital-marketing.json')
const softwareEngineeringPayload = readJsonFixture('software-engineering.json')

const loadWebandcraftsModule = async () => {
  try {
    return await import('../../scraper/webandcrafts/script.js')
  } catch {
    assert.fail('Expected Webandcrafts scraper module at ../../scraper/webandcrafts/script.js')
  }
}

test('Webandcrafts sentinels recognize the verified homepage, careers page, and jobs index', async () => {
  const webandcrafts = await loadWebandcraftsModule()

  assert.equal(webandcrafts.SOURCE, 'webandcrafts')
  assert.equal(webandcrafts.COMPANY, 'Webandcrafts')
  assert.equal(webandcrafts.HOMEPAGE_URL, 'https://webandcrafts.com/')
  assert.equal(webandcrafts.CAREERS_URL, 'https://webandcrafts.com/careers')
  assert.equal(webandcrafts.JOBS_INDEX_URL, 'https://webandcrafts.com/careers/job-openings')
  assert.equal(
    webandcrafts.JOBS_API_URL,
    'https://forms.webandcrafts.com/api/careers/career-job-listing',
  )
  assert.equal(webandcrafts.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(webandcrafts.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(webandcrafts.hasOfficialJobsIndexSignal(jobsIndexHtml), true)
})

test('Webandcrafts extracts the verified first-party job categories from the jobs index', async () => {
  const webandcrafts = await loadWebandcraftsModule()

  assert.deepEqual(
    webandcrafts.extractJobCategories(jobsIndexHtml),
    [
      {
        id: 6,
        categoryName: 'Digital Marketing',
        totalOpenings: 3,
      },
      {
        id: 11,
        categoryName: 'Software Engineering',
        totalOpenings: 2,
      },
    ],
  )
})

test('Webandcrafts maps the first-party department API payloads into distinct public job postings', async () => {
  const webandcrafts = await loadWebandcraftsModule()
  const [digitalMarketingCategory, softwareEngineeringCategory] = webandcrafts.extractJobCategories(jobsIndexHtml)

  const digitalMarketingJobs = webandcrafts.extractDepartmentJobs(
    digitalMarketingPayload,
    digitalMarketingCategory,
  )
  const softwareEngineeringJobs = webandcrafts.extractDepartmentJobs(
    softwareEngineeringPayload,
    softwareEngineeringCategory,
  )

  assert.equal(digitalMarketingJobs.length, 2)
  assert.equal(softwareEngineeringJobs.length, 2)

  const socialMediaAnalyst = digitalMarketingJobs.find((job) => job.title === 'Social Media Analyst')
  const reactEngineer = softwareEngineeringJobs.find((job) => job.title === 'Software Engineer - React')

  assert.deepEqual(
    (({
      title,
      department,
      location,
      city,
      country,
      jobId,
      requisitionId,
      sourceUrl,
      applyUrl,
      experienceRequired,
      remoteStatus,
      requiredSkills,
    }) => ({
      title,
      department,
      location,
      city,
      country,
      jobId,
      requisitionId,
      sourceUrl,
      applyUrl,
      experienceRequired,
      remoteStatus,
      requiredSkills,
    }))(socialMediaAnalyst),
    {
      title: 'Social Media Analyst',
      department: 'Digital Marketing',
      location: 'Koratty, India',
      city: 'Koratty',
      country: 'India',
      jobId: 'WAC-DM-SOC-2424',
      requisitionId: 'WAC-DM-SOC-2424',
      sourceUrl: 'https://webandcrafts.com/careers/job-openings/social-media-analyst?job_id=42&dept=6',
      applyUrl: 'https://webandcrafts.com/careers/job-openings/social-media-analyst?job_id=42&dept=6',
      experienceRequired: '2 - 5 years',
      remoteStatus: 'On-site',
      requiredSkills: [],
    },
  )

  assert.equal(reactEngineer.department, 'Software Engineering')
  assert.equal(reactEngineer.location, 'Koratty, India')
  assert.equal(reactEngineer.city, 'Koratty')
  assert.equal(reactEngineer.requisitionId, 'WAC-RACT-SOF-0645')
  assert.equal(
    reactEngineer.sourceUrl,
    'https://webandcrafts.com/careers/job-openings/software-engineer-react?job_id=64&dept=11',
  )
  assert.equal(reactEngineer.remoteStatus, 'On-site')
  assert.equal(reactEngineer.minimumQualification.includes('4+ years of experience in ReactJS.'), true)
  assert.equal(reactEngineer.jobDescription.includes('About:'), true)
  assert.equal(reactEngineer.jobDescription.includes('Responsibilities:'), true)
  assert.equal(reactEngineer.jobDescription.includes('Requirements:'), true)
})

test('Webandcrafts normalizes a first-party API opening into the shared scraper contract', async () => {
  const webandcrafts = await loadWebandcraftsModule()
  const opening = webandcrafts.extractDepartmentJobs(
    softwareEngineeringPayload,
    webandcrafts.extractJobCategories(jobsIndexHtml)[1],
  )[0]

  const normalized = normalizeScrapedJob(opening, {
    source: 'webandcrafts',
    companyName: 'Webandcrafts',
    companyCareerPage: 'https://webandcrafts.com/careers/job-openings',
    atsPlatform: 'webandcrafts-first-party-careers-api',
    countryFilter: 'India',
  })

  assert.equal(normalized.company, 'Webandcrafts')
  assert.equal(normalized.country, 'India')
  assert.equal(normalized.remoteStatus, 'On-site')
  assert.equal(normalized.jobType, 'Full-time Experienced')
})

test('Webandcrafts run verifies the trusted surfaces and returns the first-party job postings', async () => {
  const webandcrafts = await loadWebandcraftsModule()
  const requestedTextUrls = []
  const requestedDepartmentIds = []

  const jobs = await webandcrafts.createWebandcraftsScraper().run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)

      if (url === webandcrafts.HOMEPAGE_URL) return homepageHtml
      if (url === webandcrafts.CAREERS_URL) return careersHtml
      if (url === webandcrafts.JOBS_INDEX_URL) return jobsIndexHtml

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      assert.equal(url, webandcrafts.JOBS_API_URL)

      const body = JSON.parse(options.body)
      requestedDepartmentIds.push(body.wac_pro_job_dept)

      if (body.wac_pro_job_dept === 6) return digitalMarketingPayload
      if (body.wac_pro_job_dept === 11) return softwareEngineeringPayload

      throw new Error(`Unexpected department request: ${body.wac_pro_job_dept}`)
    },
  })

  assert.deepEqual(requestedTextUrls, [
    webandcrafts.HOMEPAGE_URL,
    webandcrafts.CAREERS_URL,
    webandcrafts.JOBS_INDEX_URL,
  ])
  assert.deepEqual(requestedDepartmentIds, [6, 11])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].company, 'Webandcrafts')
  assert.equal(jobs[0].source, 'webandcrafts')
  assert.equal(jobs[0].companyCareerPage, 'https://webandcrafts.com/careers/job-openings')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('Webandcrafts fails closed when the verified homepage, jobs index, or department API contract changes', async () => {
  const webandcrafts = await loadWebandcraftsModule()

  await assert.rejects(
    webandcrafts.createWebandcraftsScraper().run({
      fetchText: async (url) => {
        if (url === webandcrafts.HOMEPAGE_URL) {
          return homepageHtml.replace('href="/careers"', 'href="/about-us"')
        }
        if (url === webandcrafts.CAREERS_URL) return careersHtml
        if (url === webandcrafts.JOBS_INDEX_URL) return jobsIndexHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => digitalMarketingPayload,
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    webandcrafts.createWebandcraftsScraper().run({
      fetchText: async (url) => {
        if (url === webandcrafts.HOMEPAGE_URL) return homepageHtml
        if (url === webandcrafts.CAREERS_URL) return careersHtml
        if (url === webandcrafts.JOBS_INDEX_URL) return '<html><body><h1>Job Openings</h1></body></html>'
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => digitalMarketingPayload,
    }),
    /verified public jobs index/i,
  )

  await assert.rejects(
    webandcrafts.createWebandcraftsScraper().run({
      fetchText: async (url) => {
        if (url === webandcrafts.HOMEPAGE_URL) return homepageHtml
        if (url === webandcrafts.CAREERS_URL) return careersHtml
        if (url === webandcrafts.JOBS_INDEX_URL) return jobsIndexHtml
        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async (url, options = {}) => {
        const body = JSON.parse(options.body)

        if (body.wac_pro_job_dept === 6) {
          return {
            ...digitalMarketingPayload,
            results: {
              ...digitalMarketingPayload.results,
              data: digitalMarketingPayload.results.data.map((job, index) => (
                index === 0
                  ? { ...job, number_of_openings: 1 }
                  : job
              )),
            },
          }
        }

        return softwareEngineeringPayload
      },
    }),
    /verified public department openings/i,
  )
})
