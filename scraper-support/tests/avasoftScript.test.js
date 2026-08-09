import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

const loadAvasoftModule = async () => {
  try {
    return await import('../../scraper/avasoft/script.js')
  } catch {
    return null
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'avasoft',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('extractJobCards keeps only India roles from the AVASOFT careers page and maps them into the shared listing contract', async () => {
  const avasoft = await loadAvasoftModule()
  assert.ok(avasoft)

  const jobs = avasoft.extractJobCards(readFixture('career.html'))

  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Trainee Engineer',
    location: 'Chennai, TN, India',
    city: 'Chennai',
    jobId: 'trainee-engineer',
    requisitionId: 'trainee-engineer',
    employmentType: 'Full-time',
    experienceRequired: null,
    postingDate: null,
    closingDate: null,
    sourceUrl: 'https://avasoft.com/trainee-engineer/',
    applyUrl: 'https://avasoft.com/contact-us/',
    department: 'Software Engineering',
    minimumQualification: null,
    requiredSkills: [],
  })

  assert.equal(jobs[2].title, 'Human Resource')
  assert.equal(jobs[2].city, 'Chennai')
  assert.equal(jobs[2].department, 'HR')
})

test('extractJobDetail pulls AVASOFT location, apply link, and candidate requirements from a role page', async () => {
  const avasoft = await loadAvasoftModule()
  assert.ok(avasoft)

  const listing = avasoft.extractJobCards(readFixture('career.html'))[0]
  const detail = avasoft.extractJobDetail(readFixture('trainee-engineer.html'), listing)

  assert.equal(detail.title, 'Trainee Engineer')
  assert.equal(detail.location, 'Chennai, TN, India')
  assert.equal(detail.city, 'Chennai')
  assert.equal(detail.jobId, 'trainee-engineer')
  assert.equal(detail.requisitionId, 'trainee-engineer')
  assert.equal(detail.department, 'Software Engineering')
  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(detail.experienceRequired, '0 - 1 Years')
  assert.match(detail.jobDescription, /2025 passing outstudents/i)
  assert.equal(detail.minimumQualification, null)
  assert.deepEqual(detail.requiredSkills.slice(0, 3), [
    'Having an attitude of openness, eagerness, and endless possibilities.',
    'Somebody who starts with great doubt and great faith, having this mindset isthe highest rating for attitude in our performance pyramid.',
    'Very good speaking and written skills in English.',
  ])
  assert.equal(detail.postingDate, null)
  assert.equal(detail.closingDate, null)
  assert.equal(detail.sourceUrl, 'https://avasoft.com/trainee-engineer/')
  assert.equal(detail.applyUrl, 'https://avasoft.com/contact-us/')
})

test('normalizeScrapedJob composes AVASOFT early-career India roles from the detail page contract', async () => {
  const avasoft = await loadAvasoftModule()
  assert.ok(avasoft)

  const detail = avasoft.extractJobDetail(
    readFixture('trainee-engineer.html'),
    avasoft.extractJobCards(readFixture('career.html'))[0],
  )

  const normalized = normalizeScrapedJob(detail, {
    source: 'avasoft',
    companyName: 'AVASOFT',
    companyCareerPage: 'https://avasoft.com/career/',
    atsPlatform: 'official-company-careers',
  })

  assert.equal(normalized.company, 'AVASOFT')
  assert.equal(normalized.country, 'India')
  assert.equal(normalized.remoteStatus, 'On-site')
  assert.equal(normalized.experienceLevel, 'Entry Level')
  assert.equal(normalized.jobType, 'Full-time Fresher')
})

test('run fetches the AVASOFT careers page plus India detail pages and decorates shared runner fields', async () => {
  const avasoft = await loadAvasoftModule()
  assert.ok(avasoft)

  const requested = []
  const scraper = avasoft.createAvasoftScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requested.push(url)

      if (url === 'https://avasoft.com/career/') return readFixture('career.html')
      if (url === 'https://avasoft.com/trainee-engineer/') return readFixture('trainee-engineer.html')
      if (url === 'https://avasoft.com/business-development-executive/') {
        return readFixture('trainee-engineer.html')
          .replaceAll('Trainee Engineer', 'Business Development Executive')
          .replaceAll('Software Engineering', 'Sales')
          .replaceAll('2025 passing outstudents. We expect individuals who are passionate about working in a challenging next gen software product development environment will be the best fit. We have no criterion for a minimum CGPA or arrears.', '2025 passing outstudents. We expect individuals who are passionate about working in a Sales team will be the best fit. We have no criterion for a minimum CGPA or arrears.')
          .replaceAll('Technical knowledge with an intent to problem solving would be preferred.', 'Technical knowledge and inclination would be preferred. Expertise is not a must.')
      }
      if (url === 'https://avasoft.com/human-resource/') {
        return readFixture('trainee-engineer.html')
          .replaceAll('Trainee Engineer', 'Human Resource')
          .replaceAll('Software Engineering', 'HR')
          .replaceAll('2025 passing outstudents. We expect individuals who are passionate about working in a challenging next gen software product development environment will be the best fit. We have no criterion for a minimum CGPA or arrears.', 'We expect individuals who are cool with an attitude - straight as an arrow, young leaders with endless curiousness to explore will be the best fit. We have no criterion for a minimum CGPA or arrears.')
          .replaceAll('Having an attitude of openness, eagerness, and endless possibilities.', 'Highly adaptable and flexible.')
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(requested.length, 4)
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].company, 'AVASOFT')
  assert.equal(jobs[0].source, 'avasoft')
  assert.equal(jobs[0].link, 'https://avasoft.com/contact-us/')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
