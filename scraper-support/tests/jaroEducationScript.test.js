import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'jaroeducation',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const HOMEPAGE_HTML = readFixture('homepage.html')
const CAREERS_HTML = readFixture('careers.html')

const loadModule = async () => {
  try {
    return await import('../../scraper/jaroeducation/script.js')
  } catch {
    assert.fail('Expected Jaro Education scraper module at ../../scraper/jaroeducation/script.js')
  }
}

test('Jaro Education validates the verified homepage and careers surface', async () => {
  const jaroEducation = await loadModule()

  assert.equal(jaroEducation.SOURCE, 'jaroeducation')
  assert.equal(jaroEducation.COMPANY, 'Jaro Education')
  assert.equal(jaroEducation.HOMEPAGE_URL, 'https://www.jaroeducation.com/')
  assert.equal(jaroEducation.CAREERS_URL, 'https://www.jaroeducation.com/careers')
  assert.equal(jaroEducation.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(jaroEducation.hasOfficialCareersSignal(CAREERS_HTML), true)
})

test('Jaro Education extracts public listings from the verified careers page', async () => {
  const jaroEducation = await loadModule()

  const jobs = jaroEducation.extractPublicListings(CAREERS_HTML)

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'Administrative Manager',
    company: 'Jaro Education',
    department: null,
    location: 'Chembur, India',
    city: 'Chembur',
    country: 'India',
    jobId: 'jaroeducation-administrative-manager-chembur',
    requisitionId: 'jaroeducation-administrative-manager-chembur',
    sourceUrl: 'https://www.jaroeducation.com/careers#jaroeducation-administrative-manager-chembur',
    applyUrl: 'https://www.jaroeducation.com/careers#jaroeducation-administrative-manager-chembur',
    employmentType: null,
    experienceRequired: '10-12 years experience',
    minimumQualification: 'Bachelor’s degree in Business Administration, Management, or related field',
    preferredQualification: 'MBA/PGDM preferred (optional depending on organization)',
    requiredSkills: [
      'Strong organizational and multitasking abilities',
      'Leadership and team management skills',
      'Excellent communication and interpersonal skills',
      'Problem-solving and decision-making capability',
      'Vendor and facility management knowledge',
      'Proficiency in MS Office and office management software',
      'Time management and attention to detail',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'Oversee day-to-day administrative operations of the office.',
      'Manage office facilities, housekeeping, security, and maintenance.',
      'Supervise administrative staff and allocate responsibilities.',
      'Handle procurement of office supplies and vendor management.',
      'Maintain office records, files, and documentation systems.',
      'Coordinate travel arrangements, meetings, and events.',
      'Ensure compliance with company policies and administrative procedures.',
      'Monitor office budgets and control administrative expenses.',
      'Liaise with government authorities, service providers, and contractors when required.',
      'New office identification and existing office servicing.',
      'Implement process improvements for better office efficiency.',
      'Ensure workplace health, safety, and cleanliness standards are maintained.',
    ].join(' '),
  })
})

test('Jaro Education run fetches the verified homepage and careers page, then returns the public jobs', async () => {
  const jaroEducation = await loadModule()
  const requestedUrls = []

  const jobs = await jaroEducation.createJaroEducationScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === jaroEducation.HOMEPAGE_URL) return HOMEPAGE_HTML
      if (url === jaroEducation.CAREERS_URL) return CAREERS_HTML

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
    now: () => '2026-07-10T10:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.jaroeducation.com/',
    'https://www.jaroeducation.com/careers',
  ])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].source, 'jaroeducation')
  assert.equal(jobs[0].companyCareerPage, 'https://www.jaroeducation.com/careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-10T10:00:00.000Z')
})

test('Jaro Education fails closed when the homepage or careers contract changes materially', async () => {
  const jaroEducation = await loadModule()

  await assert.rejects(
    jaroEducation.createJaroEducationScraper().run({
      fetchText: async (url) => {
        if (url === jaroEducation.HOMEPAGE_URL) {
          return '<html><head><title>Unexpected</title></head><body></body></html>'
        }

        return CAREERS_HTML
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    jaroEducation.createJaroEducationScraper().run({
      fetchText: async (url) => {
        if (url === jaroEducation.HOMEPAGE_URL) return HOMEPAGE_HTML
        return '<html><body><h1>Careers</h1><p>No jobs</p></body></html>'
      },
    }),
    /verified official careers surface/i,
  )
})
