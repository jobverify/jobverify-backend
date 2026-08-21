import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadKgislModule = async () => {
  try {
    return await import('../../scraper/kgisl/script.js')
  } catch {
    assert.fail('Expected KGISL scraper module at ../../scraper/kgisl/script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'kgisl')

const homepageHtml = readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHtml = readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')
const currentOpeningsHtml = readFileSync(path.join(fixturesDir, 'current-openings.html'), 'utf8')
const candidateHomeHtml = readFileSync(path.join(fixturesDir, 'candidate-home.html'), 'utf8')

const createUnavailableError = (url) => {
  const error = new Error(`fetch failed | Connect Timeout Error (attempted address: ${url.includes('careerxai') ? 'careerxai.kgisl.com:443' : 'www.kgisl.com:443'}, timeout: 10000ms)`)
  error.cause = {
    code: 'UND_ERR_CONNECT_TIMEOUT',
    message: `Connect Timeout Error (attempted address: ${url.includes('careerxai') ? 'careerxai.kgisl.com:443' : 'www.kgisl.com:443'}, timeout: 10000ms)`,
  }
  return error
}

test('KGISL scraper keeps the verified first-party URLs and public job surface pinned', async () => {
  const kgisl = await loadKgislModule()

  assert.equal(kgisl.SOURCE, 'kgisl')
  assert.equal(kgisl.COMPANY, 'KGISL')
  assert.equal(kgisl.HOMEPAGE_URL, 'https://www.kgisl.com/')
  assert.equal(kgisl.CAREERS_URL, 'https://www.kgisl.com/careers')
  assert.equal(kgisl.CURRENT_OPENINGS_URL, 'https://www.kgisl.com/current-openings/')
  assert.equal(
    kgisl.CANDIDATE_HOME_URL,
    'https://careerxai.kgisl.com/ajax/candidate_home?form=wepportal',
  )
  assert.equal(kgisl.VERIFIED_ON, '2026-08-15')
  assert.equal(kgisl.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(kgisl.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(kgisl.hasOfficialCandidateHomeSignal(candidateHomeHtml), true)
  assert.equal(kgisl.extractCandidateHomeUrl(currentOpeningsHtml), kgisl.CANDIDATE_HOME_URL)

  const jobs = kgisl.extractJobs(candidateHomeHtml)
  assert.equal(jobs.length, 16)
  assert.deepEqual(jobs[0], {
    title: 'Sr.associate - Senior Associate',
    location: 'COIMBATORE-INDIA',
    jobId: 'V100889',
    applyUrl: 'https://careerxai.kgisl.com/resume/webportal_vacancy_apply_resume/VjEwMDg4OQ==',
    sourceUrl: 'https://careerxai.kgisl.com/resume/webportal_vacancy_apply_resume/VjEwMDg4OQ==',
    postingDate: '26-Jun-2026',
    jobDescription:
      'We are seeking a Senior Associate – Full Stack Developer with strong expertise in Java, Spring Boot, Angular, and PostgreSQL to design, develop, and maintain scalable, high-performance enterprise applications. The ideal candidate should demonstrate ownership, technical leadership, and a proactive approach to solving complex business and technical challenges while delivering high-quality software solutions within project timelines.',
  })
  assert.equal(jobs.at(-1)?.jobId, 'V100427')
})

test('KGISL scraper returns normalized jobs from the verified first-party candidate portal', async () => {
  const kgisl = await loadKgislModule()
  const requestedUrls = []

  const jobs = await kgisl.createKgislScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === kgisl.HOMEPAGE_URL) return homepageHtml
      if (url === kgisl.CAREERS_URL) return careersHtml
      if (url === kgisl.CURRENT_OPENINGS_URL) return currentOpeningsHtml
      if (url === kgisl.CANDIDATE_HOME_URL) return candidateHomeHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    kgisl.HOMEPAGE_URL,
    kgisl.CAREERS_URL,
    kgisl.CURRENT_OPENINGS_URL,
    kgisl.CANDIDATE_HOME_URL,
  ])
  assert.equal(jobs.length, 16)
  assert.equal(jobs[0].company, 'KGISL')
  assert.equal(jobs[0].jobId, 'V100889')
  assert.equal(jobs[0].location, 'COIMBATORE-INDIA')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].atsPlatform, 'official-first-party-candidate-portal')
  assert.equal(jobs[0].companyCareerPage, kgisl.CURRENT_OPENINGS_URL)
  assert.equal(jobs[0].companyDomain, 'kgisl.com')
  assert.equal(jobs[0].title, 'Sr.associate - Senior Associate')
  assert.equal(jobs[0].jobType, 'Full-time Experienced')
  assert.equal(jobs[0].sourceUrl, jobs[0].applyUrl)
  assert.equal(jobs[0].publicExperienceChecked, true)
})

test('KGISL scraper falls back to the verified candidate portal when the kgisl.com wrapper pages time out or 504', async () => {
  const kgisl = await loadKgislModule()
  const requestedUrls = []

  const jobs = await kgisl.createKgislScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === kgisl.HOMEPAGE_URL) {
        throw new Error('HTTP 500 for https://www.kgisl.com/')
      }
      if (url === kgisl.CAREERS_URL) {
        throw new Error('The operation was aborted due to timeout')
      }
      if (url === kgisl.CURRENT_OPENINGS_URL) {
        throw new Error('HTTP 504 for https://www.kgisl.com/current-openings/')
      }
      if (url === kgisl.CANDIDATE_HOME_URL) return candidateHomeHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    kgisl.HOMEPAGE_URL,
    kgisl.CAREERS_URL,
    kgisl.CURRENT_OPENINGS_URL,
    kgisl.CANDIDATE_HOME_URL,
  ])
  assert.equal(jobs.length, 16)
  assert.equal(jobs[0].jobId, 'V100889')
  assert.equal(jobs[0].companyCareerPage, kgisl.CURRENT_OPENINGS_URL)
})

test('KGISL scraper fails closed when the verified first-party surface drifts', async () => {
  const kgisl = await loadKgislModule()

  await assert.rejects(
    kgisl.createKgislScraper().run({
      fetchText: async (url) => {
        if (url === kgisl.HOMEPAGE_URL) return '<html><body><h1>Unexpected homepage</h1></body></html>'
        if (url === kgisl.CAREERS_URL) return careersHtml
        if (url === kgisl.CURRENT_OPENINGS_URL) return currentOpeningsHtml
        if (url === kgisl.CANDIDATE_HOME_URL) return candidateHomeHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    kgisl.createKgislScraper().run({
      fetchText: async (url) => {
        if (url === kgisl.HOMEPAGE_URL) return homepageHtml
        if (url === kgisl.CAREERS_URL) return careersHtml
        if (url === kgisl.CURRENT_OPENINGS_URL) {
          return currentOpeningsHtml.replace(
            'https://careerxai.kgisl.com/ajax/candidate_home?form=wepportal',
            'https://jobs.kgisl.com/public/openings',
          )
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified candidate portal/i,
  )

  await assert.rejects(
    kgisl.createKgislScraper().run({
      fetchText: async (url) => {
        if (url === kgisl.HOMEPAGE_URL) return homepageHtml
        if (url === kgisl.CAREERS_URL) return careersHtml
        if (url === kgisl.CURRENT_OPENINGS_URL) return currentOpeningsHtml
        if (url === kgisl.CANDIDATE_HOME_URL) {
          return '<html><body><p>No current vacancies published.</p></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /candidate portal no longer matches the verified public surface/i,
  )

  await assert.rejects(
    kgisl.createKgislScraper().run({
      fetchText: async (url) => {
        if (url === kgisl.HOMEPAGE_URL) {
          throw new Error('HTTP 500 for https://www.kgisl.com/')
        }
        if (url === kgisl.CAREERS_URL) {
          throw new Error('The operation was aborted due to timeout')
        }
        if (url === kgisl.CURRENT_OPENINGS_URL) {
          throw new Error('HTTP 504 for https://www.kgisl.com/current-openings/')
        }
        if (url === kgisl.CANDIDATE_HOME_URL) {
          return '<html><body><h1>Unexpected</h1></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /candidate portal no longer matches the verified public surface/i,
  )
})

test('KGISL returns [] when both the verified wrappers and candidate portal are temporarily unreachable from this runtime', async () => {
  const kgisl = await loadKgislModule()

  assert.equal(kgisl.isVerifiedKgislUnavailableError(createUnavailableError(kgisl.CANDIDATE_HOME_URL)), true)

  const jobs = await kgisl.createKgislScraper().run({
    fetchText: async (url) => {
      throw createUnavailableError(url)
    },
  })

  assert.deepEqual(jobs, [])
})
