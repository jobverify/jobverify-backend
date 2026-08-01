import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildSearchUrl,
  extractPaginationSummary,
  extractSearchResults,
} from '../../scraper/synopsys/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'synopsys',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchUrl keeps Synopsys listings on the public India location filter route', () => {
  assert.equal(
    buildSearchUrl(),
    'https://careers.synopsys.com/search-jobs?acm=ALL&alrpm=1269750&ascf=%5B%7B%22key%22%3A%22ALL%22%2C%22value%22%3A%22%22%7D%5D',
  )
  assert.equal(
    buildSearchUrl({ page: 2 }),
    'https://careers.synopsys.com/search-jobs?acm=ALL&alrpm=1269750&ascf=%5B%7B%22key%22%3A%22ALL%22%2C%22value%22%3A%22%22%7D%5D&p=2',
  )
})

test('extractSearchResults keeps India jobs from Synopsys listing pages and normalizes visible metadata', () => {
  const html = readFixture('search-india-page-1.html')
  const jobs = extractSearchResults(html)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Staff Cyber Security Engineer ( ES|QL, Elastic SIEM )',
    company: 'Synopsys',
    department: 'Engineering',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    jobId: '17216',
    requisitionId: '17216',
    sourceUrl: 'https://careers.synopsys.com/job/bengaluru/staff-cyber-security-engineer-es-ql-elastic-siem/44408/94796693312',
    applyUrl: 'https://careers.synopsys.com/job/bengaluru/staff-cyber-security-engineer-es-ql-elastic-siem/44408/94796693312',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '05/06/2026',
    closingDate: null,
    jobDescription: null,
  })
})

test('extractPaginationSummary reads Synopsys result counts and next-page availability from the public page', () => {
  const html = readFixture('search-india-page-1.html')

  assert.deepEqual(extractPaginationSummary(html), {
    hasNext: true,
    currentPage: 1,
    totalPages: 13,
    totalJobCount: 192,
  })
})
