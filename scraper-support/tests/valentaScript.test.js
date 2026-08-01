import assert from 'node:assert/strict'
import test from 'node:test'

const loadValentaModule = async () => {
  try {
    return await import('../../scraper/valenta/script.js')
  } catch {
    assert.fail('Expected Valenta scraper module at ../../scraper/scraper/valenta/script.js')
  }
}

const samplePayload = {
  code: 'success',
  data: [
    {
      Job_Opening_Name: 'Research Analyst [Real Estate]',
      Job_Type: 'Full time',
      Country: 'India',
      City: 'Delhi',
      id: '587339000020294055',
      $url: 'https://valentabpo.zohorecruit.com/jobs/Careers/587339000020294055/Research-Analyst-Real-Estate?source=CareerSite',
    },
    {
      Job_Opening_Name: 'Senior Accounts Manager',
      Job_Type: 'Full time',
      Country: '',
      City: '',
      Remote_Job: 'Yes',
      id: '587339000020542566',
      $url: 'https://valentabpo.zohorecruit.com/jobs/Careers/587339000020542566/Senior-Accounts-Manager?source=CareerSite',
    },
    {
      Job_Opening_Name: 'Senior Automation Developer',
      Job_Type: 'Full time',
      Country: 'India',
      City: 'Bangalore North',
      id: '587339000020294185',
      $url: 'https://valentabpo.zohorecruit.com/jobs/Careers/587339000020294185/Senior-Automation-Developer?source=CareerSite',
    },
  ],
}

test('buildApiUrl keeps Valenta on the first-party public Zoho Recruit feed', async () => {
  const { API_URL, buildApiUrl } = await loadValentaModule()

  assert.equal(buildApiUrl(), API_URL)
  assert.equal(
    API_URL,
    'https://valentabpo.zohorecruit.com/recruit/v2/public/Job_Openings?source=CareerSite&pagename=Careers',
  )
})

test('extractSearchResults keeps only India jobs from the Valenta public Zoho Recruit feed', async () => {
  const { extractSearchResults } = await loadValentaModule()
  const jobs = extractSearchResults(samplePayload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Research Analyst [Real Estate]',
    company: 'Valenta',
    department: null,
    location: 'Delhi, India',
    city: 'Delhi',
    jobId: '587339000020294055',
    requisitionId: '587339000020294055',
    sourceUrl: 'https://valentabpo.zohorecruit.com/jobs/Careers/587339000020294055/Research-Analyst-Real-Estate?source=CareerSite',
    applyUrl: 'https://valentabpo.zohorecruit.com/jobs/Careers/587339000020294055/Research-Analyst-Real-Estate?source=CareerSite',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })
  assert.deepEqual(jobs[1], {
    title: 'Senior Automation Developer',
    company: 'Valenta',
    department: null,
    location: 'Bangalore North, India',
    city: 'Bangalore North',
    jobId: '587339000020294185',
    requisitionId: '587339000020294185',
    sourceUrl: 'https://valentabpo.zohorecruit.com/jobs/Careers/587339000020294185/Senior-Automation-Developer?source=CareerSite',
    applyUrl: 'https://valentabpo.zohorecruit.com/jobs/Careers/587339000020294185/Senior-Automation-Developer?source=CareerSite',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })
})

test('run fetches Valenta public job openings and decorates shared runner fields', async () => {
  const { API_URL, createValentaScraper } = await loadValentaModule()
  const requests = []
  const scraper = createValentaScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requests.push(url)
      if (url === API_URL) return samplePayload
      throw new Error(`Unexpected Valenta URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [API_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'valenta')
  assert.equal(jobs[0].company, 'Valenta')
  assert.equal(jobs[0].link, 'https://valentabpo.zohorecruit.com/jobs/Careers/587339000020294055/Research-Analyst-Real-Estate?source=CareerSite')
  assert.equal(jobs[0].employmentType, 'Full-time')
})
