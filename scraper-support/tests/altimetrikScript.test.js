import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadAltimetrikModule = async () => {
  try {
    return await import('../../scraper/altimetrik/script.js')
  } catch {
    return null
  }
}

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'altimetrik',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const buildTwoListingFixture = () => {
  const xml = readFixture('search-results-page-0.xml')
  const blocks = [...xml.matchAll(/<jobVoList>\s*<jobSeq>[\s\S]*?<\/jobVoList>/gi)]

  if (blocks.length < 2) {
    throw new Error('Expected at least two Altimetrik listing blocks in the fixture')
  }

  const startIndex = blocks[0].index ?? 0
  const lastBlock = blocks.at(-1)
  const endIndex = (lastBlock?.index ?? startIndex) + (lastBlock?.[0].length ?? 0)

  return xml
    .slice(0, startIndex)
    .concat(blocks[0][0], blocks[1][0], xml.slice(endIndex))
    .replace('<totalJobCount>225</totalJobCount>', '<totalJobCount>2</totalJobCount>')
}

test('buildSearchRequestPayload keeps Altimetrik listings on the official RippleHire tokenized endpoint contract', async () => {
  const altimetrik = await loadAltimetrikModule()
  assert.ok(altimetrik)

  assert.deepEqual(altimetrik.buildSearchRequestPayload(), {
    page: 0,
    search: '*:*',
    campaignSeq: '',
    token: 'SWCslMw2ct8eSm7LyqVb',
    source: 'CAREERSITE',
    pagesize: 10,
  })

  assert.deepEqual(altimetrik.buildSearchRequestPayload(5), {
    page: 5,
    search: '*:*',
    campaignSeq: '',
    token: 'SWCslMw2ct8eSm7LyqVb',
    source: 'CAREERSITE',
    pagesize: 10,
  })
})

test('extractSearchResults parses Altimetrik RippleHire XML and keeps India jobs with tokenized URLs', async () => {
  const altimetrik = await loadAltimetrikModule()
  assert.ok(altimetrik)

  const xml = readFixture('search-results-page-0.xml')
  const jobs = altimetrik.extractSearchResults(xml)

  assert.equal(jobs.length, 10)
  assert.deepEqual(jobs[0], {
    title: 'Developer-Software',
    location: 'Pune, India',
    city: 'Pune',
    jobId: '882121',
    requisitionId: '882121',
    sourceUrl: 'https://altimetrik.ripplehire.com/candidate/?token=SWCslMw2ct8eSm7LyqVb&source=CAREERSITE#detail/job/882121',
    applyUrl: 'https://altimetrik.ripplehire.com/candidate/?token=SWCslMw2ct8eSm7LyqVb&source=CAREERSITE#apply/job/882121',
    experienceRequired: '0 - 0 Years',
    postingDate: null,
    department: null,
  })
  assert.equal(jobs[1].title, 'Senior Developer-Software')
  assert.equal(jobs[1].city, 'Bangalore')
})

test('extractSearchSummary reads total counts and page offsets from Altimetrik RippleHire XML', async () => {
  const altimetrik = await loadAltimetrikModule()
  assert.ok(altimetrik)

  const xml = readFixture('search-results-page-0.xml')

  assert.deepEqual(altimetrik.extractSearchSummary(xml), {
    startJobIndex: 0,
    pageSize: 10,
    totalJobCount: 225,
  })
})

test('extractJobDetail pulls Altimetrik description, posting date, skills, and apply URLs from the job detail XML', async () => {
  const altimetrik = await loadAltimetrikModule()
  assert.ok(altimetrik)

  const detail = altimetrik.extractJobDetail(readFixture('job-detail-882121.xml'), {
    title: 'Developer-Software',
    location: 'Pune, India',
    city: 'Pune',
    jobId: '882121',
    requisitionId: '882121',
    sourceUrl: altimetrik.buildDetailUrl('882121'),
    applyUrl: altimetrik.buildApplyUrl('882121'),
    experienceRequired: '0 - 0 Years',
  })

  assert.equal(detail.title, 'Developer-Software')
  assert.equal(detail.location, 'Pune, India')
  assert.equal(detail.city, 'Pune')
  assert.equal(detail.jobId, '882121')
  assert.equal(detail.requisitionId, '882121')
  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(detail.experienceRequired, '0 - 0 Years')
  assert.equal(detail.department, null)
  assert.match(detail.jobDescription, /Build, test, and maintain software solutions/i)
  assert.match(detail.jobDescription, /Experience with REST\/SOAP web services/i)
  assert.deepEqual(detail.requiredSkills, ['Java fullstack', 'J2EE'])
  assert.equal(detail.postingDate, '09-Jun-2026')
  assert.equal(detail.closingDate, null)
  assert.equal(detail.applyUrl, altimetrik.buildApplyUrl('882121'))
  assert.equal(detail.sourceUrl, altimetrik.buildDetailUrl('882121'))
})

test('run fetches the Altimetrik RippleHire listing and detail payloads, then decorates shared runner fields', async () => {
  const altimetrik = await loadAltimetrikModule()
  assert.ok(altimetrik)

  const requested = []
  const scraper = altimetrik.createAltimetrikScraper()

  const jobs = await scraper.run({
    maxPages: 1,
    fetchText: async (url, options = {}) => {
      requested.push({
        url,
        method: options.method || 'GET',
        body: options.body ? String(options.body) : null,
      })

      if (url === 'https://altimetrik.ripplehire.com/candidate/candidatejobsearch') {
        return buildTwoListingFixture()
      }

      if (url.includes('jobSeq=882121')) {
        return readFixture('job-detail-882121.xml')
      }

      if (url.includes('jobSeq=880915')) {
        return readFixture('job-detail-882121.xml')
          .replaceAll('882121', '880915')
          .replace('Developer-Software', 'Senior Developer-Software')
          .replace('Pune', 'Bangalore')
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requested.map((entry) => entry.method), ['POST', 'GET', 'GET'])
  assert.match(requested[0].body, /SWCslMw2ct8eSm7LyqVb/)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, 'Altimetrik')
  assert.equal(jobs[0].source, 'altimetrik')
  assert.equal(
    jobs[0].link,
    'https://altimetrik.ripplehire.com/candidate/?token=SWCslMw2ct8eSm7LyqVb&source=CAREERSITE#apply/job/882121',
  )
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
