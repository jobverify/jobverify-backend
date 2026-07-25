import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadFlipkartModule = async () => {
  try {
    return await import('../flipkart/script.js')
  } catch {
    assert.fail('Expected Flipkart scraper module at ../scraper/flipkart/script.js')
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'flipkart',
)

const readJsonFixture = (name) => JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'))

test('extractSearchResults maps Flipkart TurboHire jobs into the shared scraper fields', async () => {
  const { extractSearchResults } = await loadFlipkartModule()
  const payload = readJsonFixture('public-jobs-page.json')
  const jobs = extractSearchResults(payload, { companyName: 'Flipkart' })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'AM for Kerala',
    company: 'Flipkart',
    department: 'Projects (D2037)',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: 'ef888dcf-c65a-4fd2-a10e-b8dd2b7c131e',
    requisitionId: 'FIPL-68646',
    sourceUrl: 'https://flipkart.turbohire.co/job/publicjobs/fDApw2OOEXQErB1ibb9nbYbCasfF08ZwgGRE2wjxRaFPg7_Sk5mbhfDEBliUkUuE',
    applyUrl: 'https://flipkart.turbohire.co/job/publicjobs/fDApw2OOEXQErB1ibb9nbYbCasfF08ZwgGRE2wjxRaFPg7_Sk5mbhfDEBliUkUuE',
    employmentType: null,
    experienceRequired: '7-9 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Project management',
      'project execution',
      'MEP',
      'team lead',
      'vendor management',
      'electrical',
      'mechanical',
      'design review',
    ],
    postingDate: '2026-06-15T07:23:10.588362Z',
    closingDate: '2026-07-24T00:00:00',
    jobDescription: jobs[0].jobDescription,
  })
  assert.match(jobs[0].jobDescription, /Able to lead a team of Engineers/i)
  assert.match(jobs[0].jobDescription, /Project handling from end to end life cycle/i)
  assert.equal(jobs[1].city, 'Embassy Tech Village Road')
  assert.equal(jobs[1].requisitionId, 'FIPL-41726')
  assert.equal(jobs[1].experienceRequired, '8-12 years')
})

test('run obtains a public TurboHire token, fetches Flipkart jobs, and decorates shared runner fields', async () => {
  const {
    CAREER_PAGE_URL,
    FILTERED_JOBS_URL,
    NOAUTH_TOKEN_URL,
    createFlipkartScraper,
  } = await loadFlipkartModule()
  const payload = readJsonFixture('public-jobs-page.json')
  const requests = []
  const scraper = createFlipkartScraper()

  const jobs = await scraper.run({
    fetchJson: async (url, options = {}) => {
      requests.push({
        url,
        options,
      })

      if (url === NOAUTH_TOKEN_URL) {
        return {
          access_token: 'test-public-token',
        }
      }

      if (url === FILTERED_JOBS_URL) {
        return payload
      }

      throw new Error(`Unexpected Flipkart URL: ${url}`)
    },
  })

  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, NOAUTH_TOKEN_URL)
  assert.equal(requests[0].options.method, 'GET')
  assert.equal(requests[0].options.headers.Origin, 'https://flipkart.turbohire.co')
  assert.equal(requests[0].options.headers.Referer, CAREER_PAGE_URL)

  assert.equal(requests[1].url, FILTERED_JOBS_URL)
  assert.equal(requests[1].options.method, 'POST')
  assert.equal(requests[1].options.headers.Authorization, 'Bearer test-public-token')
  assert.equal(requests[1].options.headers.Origin, 'https://flipkart.turbohire.co')
  assert.equal(requests[1].options.headers.Referer, CAREER_PAGE_URL)
  assert.equal(requests[1].options.body, '{}')

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Flipkart')
  assert.equal(jobs[0].source, 'flipkart')
  assert.equal(
    jobs[0].applyUrl,
    'https://flipkart.turbohire.co/job/publicjobs/fDApw2OOEXQErB1ibb9nbYbCasfF08ZwgGRE2wjxRaFPg7_Sk5mbhfDEBliUkUuE',
  )
})
