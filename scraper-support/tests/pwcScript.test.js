import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadPwcModule = async () => {
  try {
    return await import('../../scraper/pwc/script.js')
  } catch {
    assert.fail('Expected PwC scraper module at ../../scraper/scraper/pwc/script.js')
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
    sourceUrl: 'https://pwc.wd3.myworkdayjobs.com/Global_Experienced_Careers/job/Kolkata-DN-57/Associate---SAP-ABAP-TC_145552WD',
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
  const detailPages = {
    'https://pwc.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a69e627061edd1': `
      <html>
        <head>
          <meta property="og:title" content="Associate Test Automation Engineer Agentic Automation Advisory Bangalore (India)">
          <meta property="og:description" content="Build intelligent automation solutions with 4 years of experience in test automation and agentic workflows.">
        </head>
      </html>
    `,
    'https://pwc.wd3.myworkdayjobs.com/Global_Experienced_Careers/job/Bangalore/Senior-Associate---Bengaluru-Millenia---Technology-Consulting_229383WD': `
      <html>
        <head>
          <meta property="og:title" content="Senior Associate - Bengaluru Millenia - Technology Consulting">
          <meta property="og:description" content="Join advisory delivery across technology consulting programs.">
        </head>
      </html>
    `,
  }

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === buildSearchUrl()) return html
      if (detailPages[url]) return detailPages[url]
      throw new Error(`Unexpected PwC URL: ${url}`)
    },
    fetchDetailText: async () => {
      throw new Error('provider detail API unavailable in this fixture')
    },
  })

  assert.equal(requests[0], buildSearchUrl())
  assert.equal(requests.length, 3)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'pwc')
  assert.equal(jobs[0].company, 'PwC')
  assert.ok(jobs.every((job) => job.link === job.sourceUrl || job.link === job.applyUrl))
  assert.ok(jobs.every((job) => typeof job.scrapedAt === 'string' && job.scrapedAt.length > 0))

  const automationJob = jobs.find((job) => job.jobId === 'a69e627061edd1')
  assert.ok(automationJob)
  assert.equal(
    automationJob.jobDescription,
    'Build intelligent automation solutions with 4 years of experience in test automation and agentic workflows.',
  )

  const bengaluruJob = jobs.find((job) => job.jobId === '229383WD')
  assert.ok(bengaluruJob)
  assert.equal(
    bengaluruJob.jobDescription,
    'Join advisory delivery across technology consulting programs.',
  )
})

test('run surfaces the PwC API-only error when the official careers page times out', async () => {
  const { buildSearchUrl, createPwcScraper } = await loadPwcModule()
  const scraper = createPwcScraper({ maxJobs: 1 })

  await assert.rejects(scraper.run({
    fetchText: async (url) => {
      if (url === buildSearchUrl()) {
        throw new Error('fetch failed | Connect Timeout Error (attempted address: www.pwc.in:443, timeout: 10000ms)')
      }
    },
  }), /Connect Timeout Error/i)
})

test('run enriches PwC jobs from provider detail APIs before falling back to rendered detail pages', async () => {
  const { buildSearchUrl, createPwcScraper } = await loadPwcModule()
  const searchHtml = `
    <!-- WDDATA -->
    var jsondata = [{
      "jobreqid":"288872WD",
      "title":"1-10yrs Application for Cyber- Kolkata DN 57 - RDC",
      "los":"Advisory",
      "location":"Kolkata",
      "jobsite":"Global_Experienced_Careers",
      "iso":"IND",
      "apply":"https://pwc.wd3.myworkdayjobs.com/Global_Experienced_Careers/job/Kolkata/XMLNAME-1-10yrs-Application-for-Cyber--Kolkata-DN-57---RDC_288872WD/apply"
    }] ;
    <!-- DBDATA -->
    var dbdata = [{
      "jobid":"a69e627061edd1",
      "reqid":"Job31",
      "title":"IN_Associate_Test Automation Engineer _Agentic Automation_Advisory_Bangalore (India)",
      "location":"Bangalore",
      "los":"Advisory",
      "apply":"https://pwc.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a69e627061edd1"
    }] ;
  `
  const rawRequests = []
  const detailApiRequests = []
  const scraper = createPwcScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      rawRequests.push(url)

      if (url === buildSearchUrl()) return searchHtml
      throw new Error(`Unexpected rendered PwC detail URL: ${url}`)
    },
    fetchDetailText: async (url) => {
      detailApiRequests.push(url)

      if (url === 'https://pwc.wd3.myworkdayjobs.com/wday/cxs/pwc/Global_Experienced_Careers/job/Kolkata/XMLNAME-1-10yrs-Application-for-Cyber--Kolkata-DN-57---RDC_288872WD') {
        return JSON.stringify({
          jobPostingInfo: {
            title: '1-10yrs Application for Cyber- Kolkata DN 57 - RDC',
            jobDescription: '<p>Join our cyber advisory team and support client delivery across India.</p>',
          },
        })
      }

      if (url === 'https://pwc.darwinbox.com/ms/candidateapi/job/a69e627061edd1?companyId=main') {
        return JSON.stringify({
          status: 'success',
          message: {
            job: [{
              designation_display_name: 'IN_Associate_Test Automation Engineer _Agentic Automation_Advisory_Bangalore (India)',
              experience: '2 - 4 Years',
              jd: '<p>Build intelligent automation solutions with Playwright, TypeScript, and agentic workflows.</p>',
            }],
          },
        })
      }

      throw new Error(`Unexpected PwC detail API URL: ${url}`)
    },
  })

  assert.deepEqual(rawRequests, [buildSearchUrl()])
  assert.deepEqual(
    detailApiRequests.sort(),
    [
      'https://pwc.darwinbox.com/ms/candidateapi/job/a69e627061edd1?companyId=main',
      'https://pwc.wd3.myworkdayjobs.com/wday/cxs/pwc/Global_Experienced_Careers/job/Kolkata/XMLNAME-1-10yrs-Application-for-Cyber--Kolkata-DN-57---RDC_288872WD',
    ],
  )

  const workdayJob = jobs.find((job) => job.jobId === '288872WD')
  assert.ok(workdayJob)
  assert.equal(workdayJob.experienceRequired, '1-10yrs')
  assert.match(workdayJob.jobDescription || '', /cyber advisory team/i)
  assert.equal(workdayJob.publicExperienceChecked, true)

  const darwinboxJob = jobs.find((job) => job.jobId === 'a69e627061edd1')
  assert.ok(darwinboxJob)
  assert.equal(darwinboxJob.experienceRequired, '2 - 4 Years')
  assert.match(darwinboxJob.jobDescription || '', /agentic workflows/i)
  assert.equal(darwinboxJob.publicExperienceChecked, true)
})
