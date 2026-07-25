import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadPwcModule = async () => {
  try {
    return await import('../pwc/script.js')
  } catch {
    assert.fail('Expected PwC scraper module at ../scraper/pwc/script.js')
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'pwc',
)

const readHtmlFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchUrl keeps PwC on the public India experienced jobs page', async () => {
  const { CAREER_PAGE_URL, buildSearchUrl } = await loadPwcModule()

  assert.equal(CAREER_PAGE_URL, 'https://www.pwc.in/careers/experienced-jobs.html')
  assert.equal(buildSearchUrl(), 'https://www.pwc.in/careers/experienced-jobs.html')
})

test('extractSearchResults maps PwC embedded Workday and Darwinbox jobs into shared scraper fields', async () => {
  const { extractSearchResults } = await loadPwcModule()
  const html = readHtmlFixture('experienced-jobs.html')
  const jobs = extractSearchResults(html)

  assert.equal(jobs.length, 4)

  const workdayJob = jobs.find((job) => job.jobId === '145552WD')
  assert.ok(workdayJob)
  assert.deepEqual(workdayJob, {
    title: 'Senior Associate - SAP HCM-TC',
    company: 'PwC',
    department: 'Advisory',
    location: 'Kolkata, India',
    city: 'Kolkata',
    jobId: '145552WD',
    requisitionId: '145552WD',
    sourceUrl: 'https://pwc.wd3.myworkdayjobs.com/Global_Experienced_Careers/job/Kolkata-DN-57/Associate---SAP-ABAP-TC_145552WD/apply',
    applyUrl: 'https://pwc.wd3.myworkdayjobs.com/Global_Experienced_Careers/job/Kolkata-DN-57/Associate---SAP-ABAP-TC_145552WD/apply',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })

  const darwinboxJob = jobs.find((job) => job.jobId === 'a69e627061edd1')
  assert.ok(darwinboxJob)
  assert.equal(darwinboxJob.requisitionId, 'Job31')
  assert.equal(darwinboxJob.title, 'Associate Test Automation Engineer Agentic Automation Advisory Bangalore (India)')
  assert.equal(darwinboxJob.location, 'Bangalore, India')
  assert.equal(darwinboxJob.city, 'Bangalore')
  assert.match(darwinboxJob.applyUrl, /pwc\.darwinbox\.com/i)

  const multiLocationJob = jobs.find((job) => job.jobId === 'a69fddfd8a801a')
  assert.ok(multiLocationJob)
  assert.equal(multiLocationJob.requisitionId, 'Job411')
  assert.equal(multiLocationJob.title, 'Sr Associate IDMC/MDM Developer D&A Advisory PAN India')
  assert.equal(multiLocationJob.location, 'Bangalore, Kolkata, Mumbai, India')
  assert.equal(multiLocationJob.city, 'Bangalore')

  assert.ok(jobs.every((job) => !/do not apply/i.test(job.title)))
})

test('run fetches the PwC experienced jobs page once and decorates shared runner fields', async () => {
  const { buildSearchUrl, createPwcScraper } = await loadPwcModule()
  const html = readHtmlFixture('experienced-jobs.html')
  const requests = []
  const scraper = createPwcScraper({ maxJobs: 2 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === buildSearchUrl()) return html
      throw new Error(`Unexpected PwC URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [buildSearchUrl()])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'pwc')
  assert.equal(jobs[0].company, 'PwC')
  assert.ok(jobs.every((job) => job.link === job.applyUrl))
  assert.ok(jobs.every((job) => typeof job.scrapedAt === 'string' && job.scrapedAt.length > 0))
})
