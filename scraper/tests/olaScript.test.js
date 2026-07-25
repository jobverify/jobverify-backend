import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  CAREER_PAGE_ID,
  CAREER_PAGE_URL,
  FILTERED_JOBS_URL,
  NOAUTH_TOKEN_URL,
  createOlaScraper,
  extractSearchResults,
} from '../ola/script.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'ola',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('extractSearchResults maps Ola TurboHire jobs into the shared scraper fields', () => {
  const payload = readJsonFixture('public-jobs-page.json')
  const jobs = extractSearchResults(payload, { companyName: 'Ola' })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Product Manager',
    company: 'Ola',
    department: 'Product',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '11c7e5a0-1234-4321-9999-123456789abc',
    requisitionId: 'OLA-12345',
    sourceUrl: 'https://olacareers.turbohire.co/job/publicjobs/publicjob-token-ola-123',
    applyUrl: 'https://olacareers.turbohire.co/job/publicjobs/publicjob-token-ola-123',
    employmentType: null,
    experienceRequired: '5-8 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Product management',
      'Marketplace',
      'Stakeholder communication',
    ],
    postingDate: '2026-06-20T09:00:00Z',
    closingDate: '2026-07-20T00:00:00',
    jobDescription: 'Lead product strategy for mobility platforms. Own roadmap Partner with engineering',
  })
})

test('run obtains a public TurboHire token, posts the live Ola dashboard filter shape, and decorates zero-result runner fields', async () => {
  const requests = []
  const scraper = createOlaScraper()

  const jobs = await scraper.run({
    fetchJson: async (url, options = {}) => {
      requests.push({ url, options })

      if (url === NOAUTH_TOKEN_URL) {
        return { access_token: 'test-public-token' }
      }

      if (url === FILTERED_JOBS_URL) {
        return { Total: 0, Result: [] }
      }

      throw new Error(`Unexpected Ola URL: ${url}`)
    },
  })

  assert.equal(CAREER_PAGE_ID, 'e0c1eb37-eb7a-4ca4-bcc5-d59ce4ce9212')
  assert.equal(CAREER_PAGE_URL, 'https://olacareers.turbohire.co/careerpage/e0c1eb37-eb7a-4ca4-bcc5-d59ce4ce9212')
  assert.equal(FILTERED_JOBS_URL, 'https://thapi.azurewebsites.net/api/careerpagev2/filteredjobs?orgId=e0c1eb37-eb7a-4ca4-bcc5-d59ce4ce9212&pageType=0')

  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, NOAUTH_TOKEN_URL)
  assert.equal(requests[0].options.method, 'GET')
  assert.equal(requests[0].options.headers.Origin, 'https://olacareers.turbohire.co')
  assert.equal(requests[0].options.headers.Referer, CAREER_PAGE_URL)

  assert.equal(requests[1].url, FILTERED_JOBS_URL)
  assert.equal(requests[1].options.method, 'POST')
  assert.equal(requests[1].options.headers.Authorization, 'Bearer test-public-token')
  assert.equal(requests[1].options.headers.Origin, 'https://olacareers.turbohire.co')
  assert.equal(requests[1].options.headers.Referer, CAREER_PAGE_URL)
  assert.equal(
    requests[1].options.body,
    '{"SortByV2":{"Key":"PostedDate","Order":2},"BunitIds":{"Value":null,"FilterType":0},"Experience":{"Value":null,"FilterType":0},"JobTypes":{"Value":null,"FilterType":0},"JobTypeV2":{"Value":null,"FilterType":0},"Locations":{"Value":null,"FilterType":0},"CreatedDate":{"Value":null,"FilterType":0},"Compensation":{"Value":null,"FilterType":0},"Skills":{"Value":null,"FilterType":0},"Keyword":"","ClientIds":{"Value":null,"FilterType":0},"Department":"","CustomFields":{}}',
  )

  assert.deepEqual(jobs, [])
})
