import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadKlefModule = async () => {
  try {
    return await import('../konerulakshmaiaheducationfoundation/script.js')
  } catch {
    assert.fail(
      'Expected Koneru Lakshmaiah Education Foundation scraper module at ../konerulakshmaiaheducationfoundation/script.js',
    )
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'konerulakshmaiaheducationfoundation')

const homepageHtml = readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const jobsHtml = readFileSync(path.join(fixturesDir, 'jobs.html'), 'utf8')
const facultyCareersHtml = readFileSync(path.join(fixturesDir, 'faculty-careers.html'), 'utf8')
const nonTeachingCareersHtml = readFileSync(
  path.join(fixturesDir, 'non-teaching-careers.html'),
  'utf8',
)

test('KLEF scraper pins the verified first-party homepage and public careers surfaces', async () => {
  const klef = await loadKlefModule()

  assert.equal(klef.SOURCE, 'konerulakshmaiaheducationfoundation')
  assert.equal(klef.COMPANY, 'Koneru Lakshmaiah Education Foundation')
  assert.equal(klef.HOMEPAGE_URL, 'https://www.kluniversity.in/')
  assert.equal(klef.JOBS_URL, 'https://www.kluniversity.in/jobs.aspx')
  assert.equal(klef.FACULTY_CAREERS_URL, 'https://www.kluniversity.in/careers.aspx')
  assert.equal(klef.NON_TEACHING_CAREERS_URL, 'https://www.kluniversity.in/Careers-NTS.aspx')
  assert.equal(klef.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(klef.hasOfficialJobsPageSignal(jobsHtml), true)
  assert.equal(klef.hasFacultyCareersSignal(facultyCareersHtml), true)
  assert.equal(klef.hasNonTeachingCareersSignal(nonTeachingCareersHtml), true)

  assert.deepEqual(klef.extractFacultyLocations(facultyCareersHtml), ['VIJAYAWADA', 'HYDERABAD'])

  const academicJobs = klef.extractAcademicJobs({
    jobsHtml,
    facultyCareersHtml,
  })
  assert.equal(academicJobs.length, 16)
  assert.deepEqual(academicJobs[0], {
    title: 'Academic Positions',
    company: 'Koneru Lakshmaiah Education Foundation',
    department: 'Department of Agriculture',
    location: 'Vijayawada / Hyderabad, India',
    city: null,
    country: 'India',
    jobId: 'konerulakshmaiaheducationfoundation-academic-positions-department-of-agriculture',
    requisitionId: 'konerulakshmaiaheducationfoundation-academic-positions-department-of-agriculture',
    sourceUrl: 'https://www.kluniversity.in/jobs.aspx',
    applyUrl: 'https://www.kluniversity.in/careers.aspx',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Applications are invited for Academicians and Researchers for various positions in Department of Agriculture under College of Agriculture. Apply through the official faculty careers form.',
    remoteStatus: 'On-site',
  })
  assert.equal(academicJobs.at(-1)?.department, 'Department of Pharmacy')

  const nonTeachingJobs = klef.extractNonTeachingJobs(nonTeachingCareersHtml)
  assert.equal(nonTeachingJobs.length, 21)
  assert.deepEqual(nonTeachingJobs[0], {
    title: 'Asst. Director(International Relations)',
    company: 'Koneru Lakshmaiah Education Foundation',
    department: null,
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'konerulakshmaiaheducationfoundation-non-teaching-asst-director-international-relations',
    requisitionId: 'konerulakshmaiaheducationfoundation-non-teaching-asst-director-international-relations',
    sourceUrl: 'https://www.kluniversity.in/Careers-NTS.aspx',
    applyUrl: 'https://www.kluniversity.in/Careers-NTS.aspx',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'Apply through the official non-teaching positions form on the KLEF careers page.',
    remoteStatus: 'On-site',
  })
  assert.equal(
    nonTeachingJobs.at(-1)?.title,
    'Manager / Senior Engineer / Engineer(in Electronics and Communications Engineering Department)',
  )
})

test('KLEF scraper returns normalized academic and non-teaching jobs from the verified first-party pages', async () => {
  const klef = await loadKlefModule()
  const requestedUrls = []

  const jobs = await klef.createKlefScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === klef.HOMEPAGE_URL) return homepageHtml
      if (url === klef.JOBS_URL) return jobsHtml
      if (url === klef.FACULTY_CAREERS_URL) return facultyCareersHtml
      if (url === klef.NON_TEACHING_CAREERS_URL) return nonTeachingCareersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-11T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    klef.HOMEPAGE_URL,
    klef.JOBS_URL,
    klef.FACULTY_CAREERS_URL,
    klef.NON_TEACHING_CAREERS_URL,
  ])
  assert.equal(jobs.length, 37)
  assert.equal(jobs[0].source, 'konerulakshmaiaheducationfoundation')
  assert.equal(jobs[0].companyCareerPage, 'https://www.kluniversity.in/jobs.aspx')
  assert.equal(jobs[0].companyDomain, 'kluniversity.in')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T00:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)

  const lastJob = jobs.at(-1)
  assert.equal(
    lastJob?.title,
    'Manager / Senior Engineer / Engineer(in Electronics and Communications Engineering Department)',
  )
  assert.equal(lastJob?.companyCareerPage, 'https://www.kluniversity.in/jobs.aspx')
})

test('KLEF scraper fails closed when the verified homepage or hiring surfaces drift', async () => {
  const klef = await loadKlefModule()

  await assert.rejects(
    klef.createKlefScraper().run({
      fetchText: async (url) => {
        if (url === klef.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected homepage</h1></body></html>'
        }
        if (url === klef.JOBS_URL) return jobsHtml
        if (url === klef.FACULTY_CAREERS_URL) return facultyCareersHtml
        if (url === klef.NON_TEACHING_CAREERS_URL) return nonTeachingCareersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    klef.createKlefScraper().run({
      fetchText: async (url) => {
        if (url === klef.HOMEPAGE_URL) return homepageHtml
        if (url === klef.JOBS_URL) {
          return jobsHtml.replace(
            'Applications are invited for Academicians and Researchers for various positions in the following disciplines.',
            'Unexpected landing page',
          )
        }
        if (url === klef.FACULTY_CAREERS_URL) return facultyCareersHtml
        if (url === klef.NON_TEACHING_CAREERS_URL) return nonTeachingCareersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified academic careers page/i,
  )

  await assert.rejects(
    klef.createKlefScraper().run({
      fetchText: async (url) => {
        if (url === klef.HOMEPAGE_URL) return homepageHtml
        if (url === klef.JOBS_URL) return jobsHtml
        if (url === klef.FACULTY_CAREERS_URL) {
          return facultyCareersHtml.replace(
            '<option value="HYDERABAD">HYDERABAD</option>',
            '',
          )
        }
        if (url === klef.NON_TEACHING_CAREERS_URL) return nonTeachingCareersHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified faculty careers page/i,
  )

  await assert.rejects(
    klef.createKlefScraper().run({
      fetchText: async (url) => {
        if (url === klef.HOMEPAGE_URL) return homepageHtml
        if (url === klef.JOBS_URL) return jobsHtml
        if (url === klef.FACULTY_CAREERS_URL) return facultyCareersHtml
        if (url === klef.NON_TEACHING_CAREERS_URL) {
          return nonTeachingCareersHtml.replace(
            'ContentPlaceHolder1_ddlPost',
            'ContentPlaceHolder1_ddlBroken',
          )
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified non-teaching careers page/i,
  )
})
