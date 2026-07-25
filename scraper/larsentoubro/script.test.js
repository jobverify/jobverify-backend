import assert from 'node:assert/strict'
import test from 'node:test'

const samplePayload = {
  totalRecords: 1,
  response: [
    {
      jobTitle: 'Engineer - Digital Systems',
      jobCode: 'LT-REQ-001',
      requisitionId: 'LT-REQ-001',
      locationHierarchy: 'Chennai, Tamil Nadu, India',
      organizationUnit: 'Heavy Engineering',
      employmentTenureType: 'Full Time',
      expRange: '3-5 years',
      jobPostedDate: '2026-07-08',
      jobClosureDate: '2026-08-08',
      skills: {
        mustTohave: ['Node.js', 'Automation'],
        goodtohave: ['Playwright'],
      },
      jobDescription: '<p>Build systems for industrial engineering teams.</p>',
    },
  ],
}

const emptyPayload = {
  totalRecords: 0,
  response: [],
}

const loadLarsenToubroModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Larsen & Toubro scraper module at ./script.js')
  }
}

test('buildApiUrl and buildJobDetailUrl stay pinned to the public Larsen & Toubro PeopleStrong portal', async () => {
  const larsenToubro = await loadLarsenToubroModule()

  assert.equal(larsenToubro.DEFAULT_PAGE_SIZE, 20)
  assert.equal(
    larsenToubro.CAREERS_PAGE_URL,
    'https://www.larsentoubro.com/corporate/careers',
  )
  assert.equal(
    larsenToubro.PORTAL_ORIGIN,
    'https://larsentoubrocareers.peoplestrong.com',
  )
  assert.equal(
    larsenToubro.buildApiUrl(),
    'https://larsentoubrocareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20',
  )
  assert.equal(
    larsenToubro.buildApiUrl({ offset: 20, limit: 10 }),
    'https://larsentoubrocareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=20&limit=10',
  )
  assert.equal(
    larsenToubro.buildJobDetailUrl('LT-REQ-001'),
    'https://larsentoubrocareers.peoplestrong.com/job/detail/LT-REQ-001',
  )
  assert.deepEqual(larsenToubro.buildPublicHeaders(), {
    Origin: 'https://larsentoubrocareers.peoplestrong.com',
    Referer: 'https://larsentoubrocareers.peoplestrong.com/job/joblist',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'application/json,text/plain,*/*',
    'Content-Type': 'application/json',
  })
})

test('extractSearchResults maps public PeopleStrong listing fields for Larsen & Toubro', async () => {
  const larsenToubro = await loadLarsenToubroModule()
  const jobs = larsenToubro.extractSearchResults(samplePayload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Engineer - Digital Systems',
    company: 'Larsen & Toubro',
    department: 'Heavy Engineering',
    location: 'Chennai, Tamil Nadu, India',
    city: 'Chennai',
    country: 'India',
    jobId: 'LT-REQ-001',
    requisitionId: 'LT-REQ-001',
    sourceUrl: 'https://larsentoubrocareers.peoplestrong.com/job/detail/LT-REQ-001',
    applyUrl: 'https://larsentoubrocareers.peoplestrong.com/job/detail/LT-REQ-001',
    employmentType: 'Full Time',
    experienceRequired: '3-5 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Node.js', 'Automation', 'Playwright'],
    postingDate: '2026-07-08',
    closingDate: '2026-08-08',
    jobDescription: '<p>Build systems for industrial engineering teams.</p>',
  })
})

test('run replays an empty public Larsen & Toubro PeopleStrong feed and decorates runner metadata', async () => {
  const larsenToubro = await loadLarsenToubroModule()
  const requests = []

  const jobs = await larsenToubro.createLarsenToubroScraper().run({
    fetchJson: async (url, options = {}) => {
      requests.push({ url, options })
      return emptyPayload
    },
  })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, larsenToubro.buildApiUrl())
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(requests[0].options.headers.Origin, 'https://larsentoubrocareers.peoplestrong.com')
  assert.equal(requests[0].options.headers.Referer, 'https://larsentoubrocareers.peoplestrong.com/job/joblist')
  assert.equal(requests[0].options.body, JSON.stringify(larsenToubro.DEFAULT_SEARCH_BODY))
  assert.deepEqual(jobs, [])
})
