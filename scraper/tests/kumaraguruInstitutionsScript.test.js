import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadKiModule = async () => {
  try {
    return await import('../kumaraguruinstitutions/script.js')
  } catch {
    assert.fail('Expected Kumaraguru Institutions scraper module at ../kumaraguruinstitutions/script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'kumaraguruinstitutions')

const homepageHtml = readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHtml = readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')
const currentOpeningsHtml = readFileSync(path.join(fixturesDir, 'current-openings.html'), 'utf8')
const academicHtml = readFileSync(path.join(fixturesDir, 'academic.html'), 'utf8')
const supportHtml = readFileSync(path.join(fixturesDir, 'support.html'), 'utf8')

test('Kumaraguru Institutions scraper pins the verified first-party homepage and careers pages', async () => {
  const ki = await loadKiModule()

  assert.equal(ki.SOURCE, 'kumaraguruinstitutions')
  assert.equal(ki.COMPANY, 'Kumaraguru Institutions')
  assert.equal(ki.HOMEPAGE_URL, 'https://kumaraguru.edu.in/')
  assert.equal(ki.CAREERS_URL, 'https://careers.kumaraguru.edu.in/')
  assert.equal(ki.CURRENT_OPENINGS_URL, 'https://careers.kumaraguru.edu.in/current_openings.php')
  assert.equal(ki.ACADEMIC_RECRUITMENT_URL, 'https://careers.kumaraguru.edu.in/academic.php')
  assert.equal(ki.SUPPORT_RECRUITMENT_URL, 'https://careers.kumaraguru.edu.in/support.php')

  assert.equal(ki.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(ki.hasCareersLandingSignal(careersHtml), true)
  assert.equal(ki.hasCurrentOpeningsSignal(currentOpeningsHtml), true)
  assert.equal(ki.hasAcademicRecruitmentSignal(academicHtml), true)
  assert.equal(ki.hasSupportRecruitmentSignal(supportHtml), true)

  const academicJobs = ki.extractAcademicRecruitmentJobs(academicHtml)
  assert.equal(academicJobs.length, 4)
  assert.deepEqual(academicJobs[0], {
    title: 'Faculty Opportunities',
    company: 'Kumaraguru Institutions',
    department: 'Academic Recruitment',
    location: 'Coimbatore, Tamil Nadu, India',
    city: 'Coimbatore',
    country: 'India',
    jobId: 'kumaraguruinstitutions-academic-recruitment-faculty-opportunities',
    requisitionId: 'kumaraguruinstitutions-academic-recruitment-faculty-opportunities',
    sourceUrl: 'https://careers.kumaraguru.edu.in/academic.php#faculty-opportunities',
    applyUrl: 'https://careers.kumaraguru.edu.in/academic.php',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'For individuals interested in full-time teaching careers. Roles involve teaching students, guiding projects, developing course content, and contributing to academic activities. Suitable for experienced educators, industry professionals looking to move into academia, and those passionate about shaping future generations. Apply through the official Kumaraguru Institutions academic recruitment form.',
    remoteStatus: 'On-site',
  })
  assert.equal(
    academicJobs.at(-1)?.title,
    'Adjunct / Visiting Faculty / Professor of Practice Opportunities',
  )

  const supportJobs = ki.extractSupportRecruitmentJobs(supportHtml)
  assert.equal(supportJobs.length, 4)
  assert.deepEqual(supportJobs[0], {
    title: 'Administration & Institutional Operations Opportunities',
    company: 'Kumaraguru Institutions',
    department: 'Support Services Recruitment',
    location: 'Coimbatore, Tamil Nadu, India',
    city: 'Coimbatore',
    country: 'India',
    jobId: 'kumaraguruinstitutions-support-services-recruitment-administration-institutional-operations-opportunities',
    requisitionId:
      'kumaraguruinstitutions-support-services-recruitment-administration-institutional-operations-opportunities',
    sourceUrl: 'https://careers.kumaraguru.edu.in/support.php#administration-institutional-operations-opportunities',
    applyUrl: 'https://careers.kumaraguru.edu.in/support.php',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'For professionals who enjoy planning, coordination, and managing day-to-day operations. Roles may support academic departments, institutional offices, facilities, administration, project management, and operational excellence that help the institution function effectively. Apply through the official Kumaraguru Institutions support services recruitment form.',
    remoteStatus: 'On-site',
  })
  assert.equal(
    supportJobs.at(-1)?.title,
    'Finance, HR & Institutional Services Opportunities',
  )
})

test('Kumaraguru Institutions scraper returns normalized jobs from the verified first-party category pages', async () => {
  const ki = await loadKiModule()
  const requestedUrls = []

  const jobs = await ki.createKumaraguruInstitutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === ki.HOMEPAGE_URL) return homepageHtml
      if (url === ki.CAREERS_URL) return careersHtml
      if (url === ki.CURRENT_OPENINGS_URL) return currentOpeningsHtml
      if (url === ki.ACADEMIC_RECRUITMENT_URL) return academicHtml
      if (url === ki.SUPPORT_RECRUITMENT_URL) return supportHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    ki.HOMEPAGE_URL,
    ki.CAREERS_URL,
    ki.CURRENT_OPENINGS_URL,
    ki.ACADEMIC_RECRUITMENT_URL,
    ki.SUPPORT_RECRUITMENT_URL,
  ])
  assert.equal(jobs.length, 8)
  assert.equal(jobs[0].source, 'kumaraguruinstitutions')
  assert.equal(jobs[0].companyCareerPage, 'https://careers.kumaraguru.edu.in/current_openings.php')
  assert.equal(jobs[0].companyDomain, 'kumaraguru.edu.in')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T00:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(
    jobs.at(-1)?.title,
    'Finance, HR & Institutional Services Opportunities',
  )
})

test('Kumaraguru Institutions scraper fails closed when the verified first-party surfaces drift', async () => {
  const ki = await loadKiModule()

  await assert.rejects(
    ki.createKumaraguruInstitutionsScraper().run({
      fetchText: async (url) => {
        if (url === ki.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected homepage</h1></body></html>'
        }
        if (url === ki.CAREERS_URL) return careersHtml
        if (url === ki.CURRENT_OPENINGS_URL) return currentOpeningsHtml
        if (url === ki.ACADEMIC_RECRUITMENT_URL) return academicHtml
        if (url === ki.SUPPORT_RECRUITMENT_URL) return supportHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    ki.createKumaraguruInstitutionsScraper().run({
      fetchText: async (url) => {
        if (url === ki.HOMEPAGE_URL) return homepageHtml
        if (url === ki.CAREERS_URL) return careersHtml
        if (url === ki.CURRENT_OPENINGS_URL) return currentOpeningsHtml
        if (url === ki.ACADEMIC_RECRUITMENT_URL) return academicHtml
        if (url === ki.SUPPORT_RECRUITMENT_URL) {
          return supportHtml.replace(
            'Technology & Digital Transformation Opportunities',
            'Unexpected Support Surface',
          )
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified support recruitment page/i,
  )
})
