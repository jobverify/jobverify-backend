import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildIndiaSearchUrl,
  createLtimindtreeScraper,
  extractJobDetail,
  extractResultsSummary,
  extractSearchResults,
} from '../../scraper/ltimindtree/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'ltimindtree',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildIndiaSearchUrl keeps LTIMindtree listing pages on the official India search route', () => {
  assert.equal(
    buildIndiaSearchUrl(),
    'https://careers.ltimindtree.com/search/?createNewAlert=false&q=&optionsFacetsDD_country=&optionsFacetsDD_location=&locationsearch=India',
  )
})

test('extractSearchResults parses LTIMindtree India search rows into shared scraper fields', () => {
  const html = readFixture('india-search.html')
  const jobs = extractSearchResults(html)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Senior Software Engineer',
    location: 'Bengaluru, IN',
    city: 'Bengaluru',
    jobId: '679605001',
    requisitionId: '679605001',
    sourceUrl: 'https://careers.ltimindtree.com/job/Bengaluru-Senior-Software-Engineer/679605001/',
    postingDate: 'Jun 16, 2026',
  })
  assert.equal(jobs[1].location, 'Chennai, TN, IN')
})

test('extractResultsSummary reads LTIMindtree total result and page counts from the listing chrome', () => {
  const html = readFixture('india-search.html')

  assert.deepEqual(extractResultsSummary(html), {
    totalResults: 2,
    currentPage: 1,
    totalPages: 1,
  })
})

test('extractJobDetail pulls LTIMindtree apply URL, req id, description, and job segments from the detail page', () => {
  const html = readFixture('job-detail-679605001.html')
  const detail = extractJobDetail(html, {
    sourceUrl: 'https://careers.ltimindtree.com/job/Bengaluru-Senior-Software-Engineer/679605001/',
    title: 'Senior Software Engineer',
    location: 'Bengaluru, IN',
    city: 'Bengaluru',
  })

  assert.deepEqual(detail, {
    title: 'Senior Software Engineer',
    location: 'Bengaluru, IN',
    city: 'Bengaluru',
    jobId: '536167',
    requisitionId: '536167',
    employmentType: 'Full-time',
    experienceRequired: '2 to 4 years of software development experience',
    jobDescription:
      'RESPONSIBILITIES: Understand the current capabilities and functionalities of the existing production platform Deliver new functionality for the internal production platform for the ESG Business Datapoint and Calculation development for ESG Business Analyze requirements, recommend and implement solutions, and assist UAT Closely collaborate with Product Management, Quality Assurance, Data Operation and IT Infrastructure on all stages of software development life cycle. DESIRED EXPERIENCE AND QUALIFICATIONS: 2 to 4 years of software development experience. Ruby software development. Good understanding of Domain Specific Language (DSL) concept Relational Databases, especially Oracle. Excellent problem solving skills High degree of motivation, with strong written communication skills Good verbal communication skills required for working as a part of a geographically distributed team. Ability to learn quickly, grasp important concepts, and working independently if the situation demands. Bachelor degree in Computer Science, Mathematics, Engineering, related field, or equivalent experience.',
    minimumQualification:
      'Bachelor degree in Computer Science, Mathematics, Engineering, related field, or equivalent experience.',
    preferredQualification: null,
    requiredSkills: [
      'ERP',
      'Software Engineer',
      'Computer Science',
      'Senior Product Manager',
      'Database',
      'Technology',
      'Engineering',
      'Operations',
    ],
    postingDate: 'Tue Jun 16 02:00:00 UTC 2026',
    closingDate: null,
    applyUrl: 'https://careers.ltimindtree.com/talentcommunity/apply/679605001/?locale=en_US',
    sourceUrl: 'https://careers.ltimindtree.com/job/Bengaluru-Senior-Software-Engineer/679605001/',
  })
})

test('LTIMindtree run decorates listing and detail pages into shared job records', async () => {
  const searchHtml = readFixture('india-search.html')
  const jobs = await createLtimindtreeScraper().run({
    fetchPage: async (url) => {
      if (url === buildIndiaSearchUrl()) {
        return { status: 200, url, html: searchHtml }
      }

      if (/679605001/.test(url)) {
        return { status: 200, url, html: readFixture('job-detail-679605001.html') }
      }

      if (/870365101/.test(url)) {
        return { status: 200, url, html: readFixture('job-detail-870365101.html') }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'LTIMindtree')
  assert.equal(jobs[0].source, 'ltimindtree')
  assert.equal(jobs[0].jobId, '536167')
  assert.equal(jobs[1].title, 'Specialist - Software Engineering')
  assert.equal(jobs[1].link, jobs[1].applyUrl)
})
