import assert from 'node:assert/strict'
import test from 'node:test'

const loadCohesityModule = async () => {
  try {
    return await import('../../scraper/cohesity/script.js')
  } catch {
    assert.fail('Expected Cohesity scraper module at ../../scraper/scraper/cohesity/script.js')
  }
}

const payload = {
  careerSiteDeptList: ['Engineering', 'Sales'],
  locationsByCountry: {
    India: [
      { primaryLocation: 'Bangalore - India (Office)' },
      { primaryLocation: 'India - Remote' },
    ],
  },
  job_data: {
    Engineering: [
      {
        req_id: 'R03750',
        country: 'India',
        primaryLocation: 'Pune - Panchshil - India (Office)',
        jobUrl: 'https://cohesity.wd5.myworkdayjobs.com/Cohesity_Careers/job/Pune---Panchshil---India-Office/Security-Software-Engineer_R03750/apply',
        company: 'Cohesity India Private Limited',
        categories: 'Full time',
        jobType: 'Regular',
        title: 'Security Software Engineer',
        JobID: 'b3a4ee5db1011000ecc52c34e6b30000',
        careerSiteDept: 'Engineering',
      },
      {
        req_id: 'R03690',
        country: 'India',
        primaryLocation: 'Bangalore - India (Office)',
        jobUrl: 'https://cohesity.wd5.myworkdayjobs.com/Cohesity_Careers/job/Bangalore---India-Office/Senior-Manager--Software-Engineering_R03690/apply',
        company: 'DQQ Cohesity Inc.',
        categories: 'Full time',
        jobType: 'Regular',
        title: 'Senior Manager, Software Engineering',
        JobID: '8850b6576da91001083b9d0307650000',
        careerSiteDept: 'Engineering',
      },
    ],
    Sales: [
      {
        req_id: 'R03573',
        country: 'India',
        primaryLocation: 'Bangalore - India (Office)',
        jobUrl: 'https://cohesity.wd5.myworkdayjobs.com/Cohesity_Careers/job/Bangalore---India-Office/Sr-Sales-Engineer_R03573-1/apply',
        company: 'Veritas Software Technologies India Private Limited',
        categories: 'Full time',
        jobType: 'Regular',
        title: 'Sr. Sales Engineer',
        JobID: '8b4f0d78cffc10010440434df6070000',
        careerSiteDept: 'Sales',
      },
      {
        req_id: 'R00001',
        country: 'United States of America',
        primaryLocation: 'USA - California - Remote',
        jobUrl: 'https://cohesity.wd5.myworkdayjobs.com/Cohesity_Careers/job/USA---California---Remote/Ignore_R00001/apply',
        company: 'Cohesity Inc.',
        categories: 'Full time',
        jobType: 'Regular',
        title: 'Ignore US Role',
        JobID: 'ignore-us',
        careerSiteDept: 'Sales',
      },
    ],
  },
}

test('extractSearchResults normalizes Cohesity public JSON and keeps only India jobs', async () => {
  const cohesity = await loadCohesityModule()
  const jobs = cohesity.extractSearchResults(payload)

  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Security Software Engineer',
    company: 'Cohesity India Private Limited',
    department: 'Engineering',
    location: 'Pune - Panchshil, India',
    city: 'Pune',
    country: 'India',
    jobId: 'b3a4ee5db1011000ecc52c34e6b30000',
    requisitionId: 'R03750',
    sourceUrl: 'https://cohesity.wd5.myworkdayjobs.com/Cohesity_Careers/job/Pune---Panchshil---India-Office/Security-Software-Engineer_R03750/apply',
    applyUrl: 'https://cohesity.wd5.myworkdayjobs.com/Cohesity_Careers/job/Pune---Panchshil---India-Office/Security-Software-Engineer_R03750/apply',
    employmentType: 'Full time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    jobType: 'Regular',
    additionalLocations: null,
  })
})

test('run fetches the Cohesity public JSON feed and decorates jobs', async () => {
  const cohesity = await loadCohesityModule()
  const requestedUrls = []

  const jobs = await cohesity.createCohesityScraper({
    maxJobs: 2,
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === cohesity.OPEN_POSITIONS_API_URL) return payload
      throw new Error(`Unexpected URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedUrls, [cohesity.OPEN_POSITIONS_API_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'cohesity')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[1].city, 'Bangalore')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
