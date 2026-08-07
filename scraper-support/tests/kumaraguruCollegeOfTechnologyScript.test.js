import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadKctModule = async () => {
  try {
    return await import('../../scraper/kumaragurucollegeoftechnology/script.js')
  } catch {
    assert.fail(
      'Expected Kumaraguru College of Technology scraper module at ../../scraper/kumaragurucollegeoftechnology/script.js',
    )
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'kumaragurucollegeoftechnology')

const homepageHtml = readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHtml = readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')
const currentOpeningsHtml = readFileSync(path.join(fixturesDir, 'current-openings.html'), 'utf8')
const professorsHtml = readFileSync(path.join(fixturesDir, 'professors.html'), 'utf8')
const otherOpeningsHtml = readFileSync(path.join(fixturesDir, 'other-openings.html'), 'utf8')
const doctoralHtml = readFileSync(path.join(fixturesDir, 'doctoral.html'), 'utf8')
const youngHtml = readFileSync(path.join(fixturesDir, 'young.html'), 'utf8')

test('Kumaraguru College of Technology scraper pins the verified first-party homepage and public careers surfaces', async () => {
  const kct = await loadKctModule()

  assert.equal(kct.SOURCE, 'kumaragurucollegeoftechnology')
  assert.equal(kct.COMPANY, 'Kumaraguru College of Technology')
  assert.equal(kct.HOMEPAGE_URL, 'https://kct.ac.in/')
  assert.equal(kct.CAREERS_URL, 'https://careers.kct.ac.in/')
  assert.equal(kct.CURRENT_OPENINGS_URL, 'https://careers.kct.ac.in/current_openings.html')
  assert.equal(kct.PROFESSORS_URL, 'https://careers.kct.ac.in/professors.html')
  assert.equal(kct.OTHER_OPENINGS_URL, 'https://careers.kct.ac.in/other_openings.html')
  assert.equal(kct.DOCTORAL_FELLOWSHIP_URL, 'https://careers.kct.ac.in/doctoral_kct.html')
  assert.equal(kct.YOUNG_FACULTY_FELLOWSHIP_URL, 'https://careers.kct.ac.in/young_kct.html')
  assert.equal(kct.APPLY_URL, 'https://applyjobs.kct.ac.in/')
  assert.equal(kct.KDF_APPLY_URL, 'https://kdf.kct.ac.in/')
  assert.equal(kct.KYFF_APPLY_URL, 'https://kyf.kct.ac.in/')

  assert.equal(kct.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(kct.hasCareersLandingSignal(careersHtml), true)
  assert.equal(kct.hasCurrentOpeningsSignal(currentOpeningsHtml), true)
  assert.equal(kct.hasFacultyRecruitmentSignal(professorsHtml), true)
  assert.equal(kct.hasInstitutionalRolesSignal(otherOpeningsHtml), true)
  assert.equal(kct.hasDoctoralFellowshipSignal(doctoralHtml), true)
  assert.equal(kct.hasYoungFacultyFellowshipSignal(youngHtml), true)

  const academicJobs = kct.extractAcademicJobs(professorsHtml)
  assert.equal(academicJobs.length, 17)
  assert.deepEqual(academicJobs[0], {
    title: 'Academic Positions',
    company: 'Kumaraguru College of Technology',
    department: 'Aeronautical Engineering',
    location: 'Coimbatore, Tamil Nadu, India',
    city: 'Coimbatore',
    country: 'India',
    jobId: 'kumaragurucollegeoftechnology-academic-positions-aeronautical-engineering',
    requisitionId: 'kumaragurucollegeoftechnology-academic-positions-aeronautical-engineering',
    sourceUrl: 'https://careers.kct.ac.in/professors.html',
    applyUrl: 'https://applyjobs.kct.ac.in/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Aerospace Materials, Defense and Space Technologies, Communication Systems, Sensors. Apply through the official KCT academic recruitment portal.',
    publicExperienceChecked: true,
    remoteStatus: 'On-site',
  })
  assert.equal(academicJobs.at(-1)?.department, 'MBA (Business School)')

  const institutionalJobs = kct.extractInstitutionalRoleJobs(otherOpeningsHtml)
  assert.equal(institutionalJobs.length, 9)
  assert.deepEqual(institutionalJobs[0], {
    title: 'Associate Dean - Academic Project Management',
    company: 'Kumaraguru College of Technology',
    department: 'Institutional Roles',
    location: 'Coimbatore, Tamil Nadu, India',
    city: 'Coimbatore',
    country: 'India',
    jobId: 'kumaragurucollegeoftechnology-institutional-roles-associate-dean-academic-project-management',
    requisitionId: 'kumaragurucollegeoftechnology-institutional-roles-associate-dean-academic-project-management',
    sourceUrl: 'https://careers.kct.ac.in/other_openings.html',
    applyUrl: 'https://applyjobs.kct.ac.in/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'An ideal candidate will hold good years’ experience, including roles in Academic Leadership, Planning, and Review. Key responsibilities include coordinating between various departments (Research, Alumni, Accreditation), overseeing curriculum development and faculty programs, managing student career development, and enhancing research output. The role also involves tracking placement records, organizing seminars, and supporting social impact projects, ensuring all academic operations align with institutional goals. Apply through the official KCT careers application portal.',
    publicExperienceChecked: true,
    remoteStatus: 'On-site',
  })
  assert.equal(
    institutionalJobs.at(-1)?.title,
    'Head, Centre for Competitive Exams',
  )

  assert.deepEqual(kct.extractDoctoralFellowshipJob(doctoralHtml), {
    title: 'Kumaraguru Doctoral Fellowship (KDF)',
    company: 'Kumaraguru College of Technology',
    department: 'Doctoral Fellowship',
    location: 'Coimbatore, Tamil Nadu, India',
    city: 'Coimbatore',
    country: 'India',
    jobId: 'kumaragurucollegeoftechnology-kumaraguru-doctoral-fellowship-kdf',
    requisitionId: 'kumaragurucollegeoftechnology-kumaraguru-doctoral-fellowship-kdf',
    sourceUrl: 'https://careers.kct.ac.in/doctoral_kct.html',
    applyUrl: 'https://kdf.kct.ac.in/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Kumaraguru Doctoral Fellowship - KDF (Full time & Residential) invites aspirational and meritorious candidates to pursue their research degree in the field of engineering, acquire the requisite skills and deepen the competency in the interdisciplinary research. Apply through the official KDF portal.',
    publicExperienceChecked: true,
    remoteStatus: 'On-site',
  })

  assert.deepEqual(kct.extractYoungFacultyFellowshipJob(youngHtml), {
    title: 'Kumaraguru Young Faculty Fellowship (KYFF)',
    company: 'Kumaraguru College of Technology',
    department: 'Young Faculty Fellowship',
    location: 'Coimbatore, Tamil Nadu, India',
    city: 'Coimbatore',
    country: 'India',
    jobId: 'kumaragurucollegeoftechnology-kumaraguru-young-faculty-fellowship-kyff',
    requisitionId: 'kumaragurucollegeoftechnology-kumaraguru-young-faculty-fellowship-kyff',
    sourceUrl: 'https://careers.kct.ac.in/young_kct.html',
    applyUrl: 'https://kyf.kct.ac.in/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Kumaraguru Young Faculty Fellowship – KYFF (Full time & Residential) opens avenues for aspiring post graduates passionate to get into teaching profession. Institution will provide hands-on training and facilitate building attributes necessary to become competent teaching professionals, going beyond the requirements prevailing in the academic ecosystem. Apply through the official KYFF portal.',
    publicExperienceChecked: true,
    remoteStatus: 'On-site',
  })
})

test('Kumaraguru College of Technology scraper returns normalized jobs from the verified first-party pages', async () => {
  const kct = await loadKctModule()
  const requestedUrls = []

  const jobs = await kct.createKumaraguruCollegeOfTechnologyScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === kct.HOMEPAGE_URL) return homepageHtml
      if (url === kct.CAREERS_URL) return careersHtml
      if (url === kct.CURRENT_OPENINGS_URL) return currentOpeningsHtml
      if (url === kct.PROFESSORS_URL) return professorsHtml
      if (url === kct.OTHER_OPENINGS_URL) return otherOpeningsHtml
      if (url === kct.DOCTORAL_FELLOWSHIP_URL) return doctoralHtml
      if (url === kct.YOUNG_FACULTY_FELLOWSHIP_URL) return youngHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    kct.HOMEPAGE_URL,
    kct.CAREERS_URL,
    kct.CURRENT_OPENINGS_URL,
    kct.PROFESSORS_URL,
    kct.OTHER_OPENINGS_URL,
    kct.DOCTORAL_FELLOWSHIP_URL,
    kct.YOUNG_FACULTY_FELLOWSHIP_URL,
  ])
  assert.equal(jobs.length, 28)
  assert.equal(jobs[0].source, 'kumaragurucollegeoftechnology')
  assert.equal(jobs[0].companyCareerPage, 'https://careers.kct.ac.in/current_openings.html')
  assert.equal(jobs[0].companyDomain, 'kct.ac.in')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T00:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.equal(jobs.at(-1)?.title, 'Kumaraguru Young Faculty Fellowship (KYFF)')
})

test('Kumaraguru College of Technology scraper fails closed when the verified first-party surfaces drift', async () => {
  const kct = await loadKctModule()

  await assert.rejects(
    kct.createKumaraguruCollegeOfTechnologyScraper().run({
      fetchText: async (url) => {
        if (url === kct.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected homepage</h1></body></html>'
        }
        if (url === kct.CAREERS_URL) return careersHtml
        if (url === kct.CURRENT_OPENINGS_URL) return currentOpeningsHtml
        if (url === kct.PROFESSORS_URL) return professorsHtml
        if (url === kct.OTHER_OPENINGS_URL) return otherOpeningsHtml
        if (url === kct.DOCTORAL_FELLOWSHIP_URL) return doctoralHtml
        if (url === kct.YOUNG_FACULTY_FELLOWSHIP_URL) return youngHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    kct.createKumaraguruCollegeOfTechnologyScraper().run({
      fetchText: async (url) => {
        if (url === kct.HOMEPAGE_URL) return homepageHtml
        if (url === kct.CAREERS_URL) return careersHtml
        if (url === kct.CURRENT_OPENINGS_URL) return currentOpeningsHtml
        if (url === kct.PROFESSORS_URL) {
          return professorsHtml.replace('Computing cluster:', 'Unexpected Faculty Surface')
        }
        if (url === kct.OTHER_OPENINGS_URL) return otherOpeningsHtml
        if (url === kct.DOCTORAL_FELLOWSHIP_URL) return doctoralHtml
        if (url === kct.YOUNG_FACULTY_FELLOWSHIP_URL) return youngHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified faculty recruitment page/i,
  )
})
