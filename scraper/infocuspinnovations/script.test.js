import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'tests',
  'fixtures',
  'infocuspinnovations',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')
const readJsonFixture = (name) => JSON.parse(readFixture(name))

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers-openings.html')
const careersBundleJs = readFixture('current-openings-bundle.js')
const activeJobsPayload = readJsonFixture('active-jobs.json')

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected InfoCusp Innovations scraper module at ./script.js')
  }
}

test('InfoCusp Innovations verifies the official homepage and extracts the first-party Keka config from the careers bundle', async () => {
  const infocusp = await loadModule()

  assert.equal(infocusp.SOURCE, 'infocuspinnovations')
  assert.equal(infocusp.COMPANY, 'InfoCusp Innovations')
  assert.equal(infocusp.HOMEPAGE_URL, 'https://www.infocusp.com/')
  assert.equal(infocusp.CAREERS_URL, 'https://www.infocusp.com/careers/openings/')
  assert.equal(infocusp.EXPECTED_IDENTIFIER, 'd8a117a8-6620-46fb-959e-742de38602e5')
  assert.equal(infocusp.EXPECTED_KEKA_DOMAIN, 'https://infocusp.keka.com/careers/')
  assert.equal(infocusp.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(infocusp.hasVerifiedCareersPageSignal(careersHtml), true)
  assert.equal(
    infocusp.extractCareersBundlePath(careersHtml),
    '/_astro/CurrentOpeningsList.astro_astro_type_script_index_0_lang.D10wGgkc.js',
  )
  assert.deepEqual(
    infocusp.extractCareerConfig(careersBundleJs),
    {
      identifier: 'd8a117a8-6620-46fb-959e-742de38602e5',
      domain: 'https://infocusp.keka.com/careers/',
      portalName: 'default',
    },
  )
  assert.equal(
    infocusp.buildActiveJobsUrl(infocusp.extractCareerConfig(careersBundleJs)),
    'https://infocusp.keka.com/careers/api/embedjobs/default/active/d8a117a8-6620-46fb-959e-742de38602e5',
  )
})

test('InfoCusp Innovations keeps India jobs from the verified Keka feed and decorates runner output', async () => {
  const infocusp = await loadModule()

  const extractedJobs = infocusp.extractSearchResults(activeJobsPayload, {
    domain: 'https://infocusp.keka.com/careers/',
  })

  assert.deepEqual(extractedJobs, [{
    title: 'Senior Data Engineer',
    company: 'InfoCusp Innovations',
    department: 'Software',
    location: 'Ahmedabad, GJ, India',
    city: 'Ahmedabad',
    country: 'India',
    jobId: '76348',
    requisitionId: '76348',
    sourceUrl: 'https://infocusp.keka.com/careers/jobdetails/76348',
    applyUrl: 'https://infocusp.keka.com/careers/jobdetails/76348',
    employmentType: 'Full Time',
    experienceRequired: '4+',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-17',
    closingDate: null,
    jobDescription: 'About the Role We are seeking a highly skilled Senior Data Engineer with strong expertise in designing and building scalable modern data platforms.',
  }])

  const requestedTexts = []
  const requestedJson = []
  const jobs = await infocusp.createInfoCuspInnovationsScraper().run({
    fetchText: async (url) => {
      requestedTexts.push(url)

      if (url === infocusp.HOMEPAGE_URL) return homepageHtml
      if (url === infocusp.CAREERS_URL) return careersHtml
      if (url === 'https://www.infocusp.com/_astro/CurrentOpeningsList.astro_astro_type_script_index_0_lang.D10wGgkc.js') {
        return careersBundleJs
      }

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)

      if (url === 'https://infocusp.keka.com/careers/api/embedjobs/default/active/d8a117a8-6620-46fb-959e-742de38602e5') {
        return activeJobsPayload
      }

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    infocusp.HOMEPAGE_URL,
    infocusp.CAREERS_URL,
    'https://www.infocusp.com/_astro/CurrentOpeningsList.astro_astro_type_script_index_0_lang.D10wGgkc.js',
  ])
  assert.deepEqual(requestedJson, [
    'https://infocusp.keka.com/careers/api/embedjobs/default/active/d8a117a8-6620-46fb-959e-742de38602e5',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'infocuspinnovations')
  assert.equal(jobs[0].link, 'https://infocusp.keka.com/careers/jobdetails/76348')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('InfoCusp Innovations fails closed when the verified official surfaces or Keka config change', async () => {
  const infocusp = await loadModule()

  await assert.rejects(
    infocusp.createInfoCuspInnovationsScraper().run({
      fetchText: async (url) => {
        if (url === infocusp.HOMEPAGE_URL) {
          return '<html><title>Unexpected</title></html>'
        }

        throw new Error(`Unexpected text URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    infocusp.createInfoCuspInnovationsScraper().run({
      fetchText: async (url) => {
        if (url === infocusp.HOMEPAGE_URL) return homepageHtml
        if (url === infocusp.CAREERS_URL) return careersHtml
        if (url === 'https://www.infocusp.com/_astro/CurrentOpeningsList.astro_astro_type_script_index_0_lang.D10wGgkc.js') {
          return "const e={identifier:'changed',domain:'https://infocusp.keka.com/careers'}"
        }

        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /verified Keka job surface changed materially/i,
  )
})
