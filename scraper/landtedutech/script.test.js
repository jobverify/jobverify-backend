import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadLandtEdutechModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected L&T EduTech scraper module at ./script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures')

const homepageHtml = fs.readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersShellHtml = fs.readFileSync(path.join(fixturesDir, 'careers-shell.html'), 'utf8')

const samplePayload = {
  totalRecords: 2,
  response: [
    {
      organizationUnitComplete:
        'LT-Larsen & Toubro Limited>LEDT-Edutech>EDT01-Edutech>19100010-EduTech - Common',
      jobPostedDate: '2026-03-10',
      locationHierarchyComplete: 'India>Tamil Nadu>Chennai Head Qrs.',
      jobDetailUrl: 'https://larsentoubrocareers.peoplestrong.com/job/detail/LNT_BA-P_1694797',
      requisitionId: 1694797,
      jobTitle: 'Business Analyst - PMO',
      jobCode: 'LNT/BA-P/1694797',
      openings: 1,
      organizationUnit: 'LEDT-Edutech',
      jobClosureDate: '2026-09-06',
      locationHierarchy: 'Chennai Head Qrs.',
      expRange: '2-5 years',
      skills: {
        mustTohave: [],
        goodtohave: ['Business Analysis'],
      },
      programType: 'Operations',
      roleType: 'Business Support (Executives Assistants)',
      employmentTenureType: null,
    },
    {
      organizationUnitComplete:
        'LT-Larsen & Toubro Limited>VALV-L&T Valves Limited>Sales',
      jobPostedDate: '2026-07-10',
      locationHierarchyComplete: 'India>Maharashtra>Pune',
      jobDetailUrl: 'https://larsentoubrocareers.peoplestrong.com/job/detail/LNT_SE_1755549',
      requisitionId: 1755549,
      jobTitle: 'Sales Engineer',
      jobCode: 'LNT/SE/1755549',
      openings: 1,
      organizationUnit: 'VALV-L&T Valves Limited',
      jobClosureDate: '2026-08-30',
      locationHierarchy: 'Pune',
      expRange: '3-6 years',
      skills: {
        mustTohave: ['Sales'],
        goodtohave: [],
      },
      employmentTenureType: 'Full Time',
    },
  ],
}

test('L&T EduTech scraper keeps the official homepage, careers shell, and Edutech filter pinned', async () => {
  const landtEdutech = await loadLandtEdutechModule()

  assert.equal(landtEdutech.SOURCE, 'landtedutech')
  assert.equal(landtEdutech.COMPANY, 'L&T EduTech')
  assert.equal(landtEdutech.HOMEPAGE_URL, 'https://lntedutech.com/')
  assert.equal(
    landtEdutech.CAREERS_URL,
    'https://larsentoubrocareers.peoplestrong.com/job/joblist',
  )
  assert.equal(landtEdutech.COMPANY_DOMAIN, 'lntedutech.com')
  assert.equal(landtEdutech.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(landtEdutech.hasOfficialCareersShell(careersShellHtml), true)

  const jobs = landtEdutech.extractEdutechJobs(samplePayload)
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Business Analyst - PMO',
    company: 'L&T EduTech',
    department: 'LEDT-Edutech',
    location: 'Chennai Head Qrs., India',
    city: 'Chennai Head Qrs.',
    country: 'India',
    jobId: 'LNT/BA-P/1694797',
    requisitionId: '1694797',
    sourceUrl: 'https://larsentoubrocareers.peoplestrong.com/job/detail/LNT_BA-P_1694797',
    applyUrl: 'https://larsentoubrocareers.peoplestrong.com/job/detail/LNT_BA-P_1694797',
    employmentType: null,
    experienceRequired: '2-5 years',
    publicExperienceChecked: true,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Business Analysis'],
    postingDate: '2026-03-10',
    closingDate: '2026-09-06',
    jobDescription: null,
    companyCareerPage: 'https://larsentoubrocareers.peoplestrong.com/job/joblist',
    companyDomain: 'lntedutech.com',
    atsPlatform: 'peoplestrong',
  })
})

test('L&T EduTech scraper returns only Edutech jobs from the verified first-party careers surface', async () => {
  const landtEdutech = await loadLandtEdutechModule()
  const requestedPages = []
  const apiRequests = []

  const jobs = await landtEdutech.createLandtEdutechScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === landtEdutech.HOMEPAGE_URL) {
        return { status: 200, html: homepageHtml }
      }

      if (url === landtEdutech.CAREERS_URL) {
        return { status: 404, html: careersShellHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      apiRequests.push({ url, options })
      return samplePayload
    },
  })

  assert.deepEqual(requestedPages, [
    landtEdutech.HOMEPAGE_URL,
    landtEdutech.CAREERS_URL,
  ])
  assert.equal(apiRequests.length, 1)
  assert.equal(apiRequests[0].url, landtEdutech.buildApiUrl())
  assert.equal(apiRequests[0].options.method, 'POST')
  assert.deepEqual(apiRequests[0].options.headers, landtEdutech.buildPublicHeaders())
  assert.equal(apiRequests[0].options.body, JSON.stringify({}))
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'landtedutech')
  assert.equal(jobs[0].company, 'L&T EduTech')
  assert.equal(jobs[0].department, 'LEDT-Edutech')
  assert.equal(jobs[0].location, 'Chennai Head Qrs., India')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].companyDomain, 'lntedutech.com')
  assert.equal(
    jobs[0].companyCareerPage,
    'https://larsentoubrocareers.peoplestrong.com/job/joblist',
  )
  assert.equal(jobs[0].atsPlatform, 'peoplestrong')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})

test('L&T EduTech scraper fails closed when the verified first-party surface drifts', async () => {
  const landtEdutech = await loadLandtEdutechModule()

  await assert.rejects(
    landtEdutech.createLandtEdutechScraper().run({
      fetchPage: async (url) => {
        if (url === landtEdutech.HOMEPAGE_URL) {
          return { status: 200, html: '<html><body><h1>Placeholder</h1></body></html>' }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => samplePayload,
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    landtEdutech.createLandtEdutechScraper().run({
      fetchPage: async (url) => {
        if (url === landtEdutech.HOMEPAGE_URL) {
          return { status: 200, html: homepageHtml }
        }

        if (url === landtEdutech.CAREERS_URL) {
          return { status: 404, html: '<html><body><h1>No portal here</h1></body></html>' }
        }

        throw new Error(`Unexpected page URL: ${url}`)
      },
      fetchJson: async () => samplePayload,
    }),
    /verified official careers shell/i,
  )
})
