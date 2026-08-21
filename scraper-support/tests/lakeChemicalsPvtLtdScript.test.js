import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'lakechemicalspvtltd',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readFixture('homepage.html')
const verifiedJobSearchHtml = readFixture('job-search.html')

const buildConnectTimeoutError = () => {
  const error = new Error('fetch failed')
  error.cause = {
    code: 'UND_ERR_CONNECT_TIMEOUT',
    message: 'Connect Timeout Error (attempted addresses: 13.248.243.5:443, 76.223.105.230:443, timeout: 10000ms)',
  }
  return error
}

const loadLakeChemicalsModule = async () => {
  try {
    return await import('../../scraper/lakechemicalspvtltd/script.js')
  } catch {
    assert.fail('Expected Lake Chemicals scraper module at ../../scraper/lakechemicalspvtltd/script.js')
  }
}

test('Lake Chemicals scraper recognizes the verified homepage and first-party job search surface', async () => {
  const lakeChemicals = await loadLakeChemicalsModule()

  assert.equal(lakeChemicals.SOURCE, 'lakechemicalspvtltd')
  assert.equal(lakeChemicals.COMPANY, 'Lake Chemicals Pvt. Ltd')
  assert.equal(lakeChemicals.HOMEPAGE_URL, 'https://lakechemicals.com/')
  assert.equal(lakeChemicals.JOB_SEARCH_URL, 'https://lakechemicals.com/job-search')
  assert.equal(lakeChemicals.isVerifiedLakeChemicalsUnavailableError(buildConnectTimeoutError()), true)
  assert.equal(lakeChemicals.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(lakeChemicals.hasOfficialJobSearchSignal(verifiedJobSearchHtml), true)

  const jobs = lakeChemicals.extractPublicJobs(verifiedJobSearchHtml)

  assert.equal(jobs.length, 6)
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Production Executive/ Senior Executive',
      'Production Technician/ Junior Officer',
      'Quality Control- Senior Executive',
      'Marketing Executive',
      'EHS – Sr. Executive / Assistant Manager',
      'Quality Control- Assistant/Deputy Manager',
    ],
  )
  assert.deepEqual(
    jobs.map((job) => job.location),
    [
      'Attibele Industrial Area, Bangalore, India',
      'Attibele Industrial Area, Bangalore, India',
      'Attibele Industrial Area, Bangalore, India',
      'Shivaji Nagar, Bangalore, India',
      'Attibele Industrial Area, Bangalore, India',
      'Attibele Industrial Area, Bangalore, India',
    ],
  )
  assert.deepEqual(
    jobs.map((job) => job.city),
    ['Bangalore', 'Bangalore', 'Bangalore', 'Bangalore', 'Bangalore', 'Bangalore'],
  )
  assert.equal(jobs[0].minimumQualification, 'Diploma in Chemical Engineering, B.Sc. in Chemistry, B.Tech/ B.E. in Chemical Engineering')
  assert.equal(jobs[0].experienceRequired, '5-8 years')
  assert.deepEqual(jobs[0].requiredSkills, [
    'Experience in handling reactors, centrifuges, dryers',
    'Experience of having worked in the Intermediate Area & Clean Room',
    'Adherence to cGmp and safety practices',
    'Flexibility of working in shifts',
  ])
  assert.equal(jobs[3].minimumQualification, 'MBA/BBA/BBM in Marketing')
  assert.equal(jobs[3].experienceRequired, 'Fresher / 1-2 years of experience in API Marketing')
  assert.ok(
    jobs.every((job) =>
      job.country === 'India'
      && job.sourceUrl.startsWith('https://lakechemicals.com/job-search#lakechemicalspvtltd-')
      && job.applyUrl === 'https://lakechemicals.com/job-search'
      && job.jobDescription.includes('Apply via the official Lake Chemicals job search page.')),
  )
})

test('Lake Chemicals scraper returns the public first-party roles from the verified job search page', async () => {
  const lakeChemicals = await loadLakeChemicalsModule()
  const requestedUrls = []

  const jobs = await lakeChemicals.createLakeChemicalsPvtLtdScraper({
    now: () => '2026-07-11T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === lakeChemicals.HOMEPAGE_URL) return verifiedHomepageHtml
      if (url === lakeChemicals.JOB_SEARCH_URL) return verifiedJobSearchHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [lakeChemicals.HOMEPAGE_URL, lakeChemicals.JOB_SEARCH_URL])
  assert.equal(jobs.length, 6)
  assert.equal(jobs[0].source, 'lakechemicalspvtltd')
  assert.equal(jobs[0].company, 'Lake Chemicals Pvt. Ltd')
  assert.equal(jobs[0].companyCareerPage, 'https://lakechemicals.com/job-search')
  assert.equal(jobs[0].companyDomain, 'lakechemicals.com')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T00:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].city, 'Bangalore')
})

test('Lake Chemicals scraper fails closed when the verified homepage or job search surface drifts', async () => {
  const lakeChemicals = await loadLakeChemicalsModule()

  await assert.rejects(
    lakeChemicals.createLakeChemicalsPvtLtdScraper().run({
      fetchText: async (url) => {
        if (url === lakeChemicals.HOMEPAGE_URL) return '<html><title>Unexpected</title></html>'
        return verifiedJobSearchHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    lakeChemicals.createLakeChemicalsPvtLtdScraper().run({
      fetchText: async (url) => {
        if (url === lakeChemicals.HOMEPAGE_URL) return verifiedHomepageHtml
        return verifiedJobSearchHtml.replace(
          'WE&#x27;RE HIRING!!',
          'WE ARE GROWING',
        )
      },
    }),
    /verified first-party job search page/i,
  )

  await assert.rejects(
    lakeChemicals.createLakeChemicalsPvtLtdScraper().run({
      fetchText: async (url) => {
        if (url === lakeChemicals.HOMEPAGE_URL) return verifiedHomepageHtml
        return verifiedJobSearchHtml.replace(
          'data-aid="CONTENT_DESCRIPTION1_RENDERED"',
          'data-aid="CONTENT_DESCRIPTION_CHANGED"',
        )
      },
    }),
    /verified public job cards changed shape/i,
  )
})

test('Lake Chemicals scraper returns [] when both verified first-party surfaces are temporarily unreachable from this runtime', async () => {
  const lakeChemicals = await loadLakeChemicalsModule()
  const requestedUrls = []

  const jobs = await lakeChemicals.createLakeChemicalsPvtLtdScraper({
    now: () => '2026-08-15T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      throw buildConnectTimeoutError()
    },
  })

  assert.deepEqual(requestedUrls, [
    lakeChemicals.HOMEPAGE_URL,
    lakeChemicals.JOB_SEARCH_URL,
  ])
  assert.deepEqual(jobs, [])
})
