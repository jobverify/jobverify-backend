import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadTcsModule = async () => {
  try {
    return await import('../tcs/script.js')
  } catch {
    assert.fail('Expected TCS scraper module at ../scraper/tcs/script.js')
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'tcs',
)

const readJsonFixture = (name) => JSON.parse(
  readFileSync(path.join(fixturesDir, name), 'utf8'),
)

test('buildSearchPayload and buildSearchUrl follow the public TCS candidate app contract', async () => {
  const {
    CAREER_PAGE_URL,
    SEARCH_API_URL,
    buildSearchPayload,
    buildPublicJobUrl,
  } = await loadTcsModule()

  assert.equal(CAREER_PAGE_URL, 'https://ibegin.tcsapps.com/candidate/')
  assert.equal(SEARCH_API_URL, 'https://ibegin.tcsapps.com/candidate/api/v1/jobs/searchJ')
  assert.equal(buildPublicJobUrl('419133J'), 'https://ibegin.tcsapps.com/candidate/jobs/419133J')
  assert.deepEqual(buildSearchPayload(), {
    jobTitle: null,
    jobCity: null,
    jobFunction: null,
    jobExperience: null,
    jobSkill: null,
    pageNumber: '1',
    userText: '',
    jobTitleOrder: null,
    jobCityOrder: null,
    jobFunctionOrder: null,
    jobExperienceOrder: null,
    applyByOrder: null,
    regular: true,
    walkin: true,
  })
  assert.equal(buildSearchPayload({ page: 3 }).pageNumber, '3')
})

test('extractSearchResults keeps TCS jobs from the public candidate search API', async () => {
  const { extractPaginationSummary, extractSearchResults } = await loadTcsModule()
  const payload = readJsonFixture('search-results-page-1.json')
  const jobs = extractSearchResults(payload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Middleware Support Engineer',
    company: 'TCS',
    department: 'Technology',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    jobId: '419133J',
    requisitionId: '419133',
    sourceUrl: 'https://ibegin.tcsapps.com/candidate/jobs/419133J',
    applyUrl: 'https://ibegin.tcsapps.com/candidate/jobs/419133J',
    employmentType: 'Full-time',
    experienceRequired: '3-8 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Middleware'],
    postingDate: null,
    closingDate: '2026-07-04',
    jobDescription: null,
  })
  assert.deepEqual(jobs[1].requiredSkills, ['Automation Testing', 'Java', 'Selenium'])

  assert.deepEqual(extractPaginationSummary(payload, { page: 1 }), {
    page: 1,
    pageSize: 10,
    totalRecords: 4154,
    totalPages: 416,
    hasNext: true,
  })
})

test('extractJobDetail reads TCS detail metadata and strips HTML descriptions', async () => {
  const { extractJobDetail } = await loadTcsModule()
  const payload = readJsonFixture('job-detail-419133.json')
  const detail = extractJobDetail(payload, {
    title: 'Middleware Support Engineer',
    company: 'TCS',
    department: 'Technology',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    jobId: '419133J',
    requisitionId: '419133',
    sourceUrl: 'https://ibegin.tcsapps.com/candidate/jobs/419133J',
    applyUrl: 'https://ibegin.tcsapps.com/candidate/jobs/419133J',
    employmentType: 'Full-time',
    experienceRequired: '3-8 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Middleware'],
    postingDate: null,
    closingDate: '2026-07-04',
    jobDescription: null,
  })

  assert.equal(detail.title, 'Middleware Support Engineer')
  assert.equal(detail.jobId, '419133J')
  assert.equal(detail.requisitionId, '419133')
  assert.equal(detail.department, 'Technology')
  assert.equal(detail.location, 'Bengaluru, India')
  assert.equal(detail.city, 'Bengaluru')
  assert.equal(detail.minimumQualification, 'Bachelor of Engineering')
  assert.equal(detail.experienceRequired, '3 - 8 Years')
  assert.equal(detail.closingDate, '2026-07-04')
  assert.deepEqual(detail.requiredSkills, ['Middleware'])
  assert.match(detail.jobDescription, /TCS has been a great pioneer/i)
  assert.match(detail.jobDescription, /Apache Tomcat/i)
  assert.match(detail.jobDescription, /Ansible Tower/i)
})

test('buildDetailRequestBody picks the correct public detail API for regular and walk-in jobs', async () => {
  const { buildDetailApiUrl, buildDetailRequestBody } = await loadTcsModule()

  assert.equal(buildDetailApiUrl('419133J'), 'https://ibegin.tcsapps.com/candidate/api/v1/job/desc')
  assert.equal(buildDetailApiUrl('519001W'), 'https://ibegin.tcsapps.com/candidate/api/v1/job/desc/walkin')
  assert.deepEqual(buildDetailRequestBody('419133J'), { jobId: '419133' })
  assert.deepEqual(buildDetailRequestBody('519001W'), { jobId: '519001' })
})

test('run fetches TCS search results and detail payloads, then decorates shared runner fields', async () => {
  const {
    SEARCH_API_URL,
    buildDetailApiUrl,
    buildDetailRequestBody,
    buildSearchPayload,
    createTcsScraper,
  } = await loadTcsModule()
  const page1Payload = readJsonFixture('search-results-page-1.json')
  const detailPayload = readJsonFixture('job-detail-419133.json')
  const requests = []
  const scraper = createTcsScraper({ maxPages: 2, maxJobs: 2 })

  const jobs = await scraper.run({
    fetchJson: async (url, options = {}) => {
      requests.push({ url, options })

      if (url === SEARCH_API_URL) return page1Payload
      if (url === buildDetailApiUrl('419133J')) return detailPayload
      if (url === buildDetailApiUrl('419132J')) {
        return {
          ...detailPayload,
          data: {
            ...detailPayload.data,
            jobId: 419132,
            title: 'Automation Testing - Java, Selenium',
            location: 'Pune',
            skilldetail: 'Automation Testing , Java , Selenium',
            experience: '3 - 10 Years',
          },
        }
      }

      throw new Error(`Unexpected TCS URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    {
      url: SEARCH_API_URL,
      options: {
        method: 'POST',
        body: buildSearchPayload(),
      },
    },
    {
      url: buildDetailApiUrl('419133J'),
      options: {
        method: 'POST',
        body: buildDetailRequestBody('419133J'),
      },
    },
    {
      url: buildDetailApiUrl('419132J'),
      options: {
        method: 'POST',
        body: buildDetailRequestBody('419132J'),
      },
    },
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'tcs')
  assert.equal(jobs[0].company, 'TCS')
  assert.ok(jobs.every((job) => job.link === job.applyUrl))
  assert.ok(jobs.every((job) => typeof job.scrapedAt === 'string' && job.scrapedAt.length > 0))
})
