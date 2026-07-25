import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => import('./script.js')

const workdayPayload = {
  total: 4,
  jobPostings: [
    {
      title: 'Senior Engineer - IT Infrastructure & Storage',
      externalPath: '/job/Bangalore/Principal-Engineer_16422',
      locationsText: 'Bangalore',
      postedOn: 'Posted 30+ Days Ago',
      bulletFields: ['16422'],
    },
    {
      title: 'Senior Engineer - SharePoint Administration',
      externalPath: '/job/Bangalore/Senior-Lead-SharePoint-Administration_16848',
      locationsText: 'Bangalore',
      postedOn: 'Posted 6 Days Ago',
      bulletFields: ['16848'],
    },
    {
      title: 'Sales Account Executive',
      externalPath: '/job/Paris/Account-Manager_16552',
      locationsText: 'Paris',
      postedOn: 'Posted 5 Days Ago',
      bulletFields: ['16552'],
    },
  ],
}

test('Manhatten constants now point at the verified Manhattan Associates official Workday surface', async () => {
  const manhatten = await loadModule()

  assert.equal(manhatten.SOURCE, 'manhatten')
  assert.equal(manhatten.COMPANY, 'Manhattan Associates')
  assert.equal(manhatten.CAREERS_PAGE_URL, 'https://www.manh.com/en-in/about-us/careers')
  assert.equal(manhatten.WORKDAY_SEARCH_URL, 'https://manh.wd5.myworkdayjobs.com/en-US/External/jobs')
  assert.equal(manhatten.WORKDAY_JOBS_API_URL, 'https://manh.wd5.myworkdayjobs.com/wday/cxs/manh/External/jobs')
  assert.equal(manhatten.WORKDAY_SEARCH_TEXT, 'India')
})

test('Manhatten maps only India Workday postings from the verified public jobs API search', async () => {
  const manhatten = await loadModule()

  const jobs = manhatten.extractWorkdayJobs(workdayPayload, {
    scrapedAt: '2026-07-19T00:00:00.000Z',
  })

  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    jobId: job.jobId,
    location: job.location,
    city: job.city,
    link: job.link,
  })), [
    {
      title: 'Senior Engineer - IT Infrastructure & Storage',
      jobId: '16422',
      location: 'Bangalore, India',
      city: 'Bangalore',
      link: 'https://manh.wd5.myworkdayjobs.com/en-US/External/job/Bangalore/Principal-Engineer_16422',
    },
    {
      title: 'Senior Engineer - SharePoint Administration',
      jobId: '16848',
      location: 'Bangalore, India',
      city: 'Bangalore',
      link: 'https://manh.wd5.myworkdayjobs.com/en-US/External/job/Bangalore/Senior-Lead-SharePoint-Administration_16848',
    },
  ])
  assert.ok(jobs.every((job) => job.company === 'Manhattan Associates'))
  assert.ok(jobs.every((job) => job.source === 'manhatten'))
  assert.ok(jobs.every((job) => job.scrapedAt === '2026-07-19T00:00:00.000Z'))
})

test('run fetches the Manhattan Workday jobs API with the live-supported India search text', async () => {
  const manhatten = await loadModule()
  const requestedPages = []

  const jobs = await manhatten.createManhattenScraper({
    now: () => '2026-07-19T00:00:00.000Z',
  }).run({
    fetchJobsPage: async (request) => {
      requestedPages.push(request)
      return workdayPayload
    },
  })

  assert.deepEqual(requestedPages, [{
    jobsApiUrl: manhatten.WORKDAY_JOBS_API_URL,
    bootstrapUrl: manhatten.WORKDAY_SEARCH_URL,
    appliedFacets: {},
    offset: 0,
    limit: 20,
    searchText: 'India',
    source: 'manhatten',
  }])
  assert.equal(jobs.length, 2)
})
