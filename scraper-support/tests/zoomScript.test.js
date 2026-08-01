import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  buildSearchUrl,
  extractPaginationSummary,
  extractSearchResults,
} from '../../scraper/zoom/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'zoom',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

test('buildSearchUrl keeps Zoom listings on the public India search route', () => {
  assert.equal(
    buildSearchUrl(),
    'https://careers.zoom.us/jobs/search?query=India',
  )
})

test('extractSearchResults keeps India jobs and normalizes the Zoom card fields', () => {
  const html = readFixture('search-india.html')
  const jobs = extractSearchResults(html)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Fullstack Engineer',
    company: 'Zoom',
    department: 'Engineering',
    location: 'India',
    city: null,
    jobId: 'R18899',
    requisitionId: 'R18899',
    sourceUrl: 'https://careers.zoom.us/jobs/fullstack-engineer-india',
    applyUrl: 'https://careers.zoom.us/jobs/fullstack-engineer-india',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'Remote',
  })
})

test('extractPaginationSummary reads the Zoom listing counts without inventing extra pages', () => {
  const html = readFixture('search-india.html')

  assert.deepEqual(extractPaginationSummary(html), {
    hasNext: false,
    totalJobCount: 8,
  })
})
