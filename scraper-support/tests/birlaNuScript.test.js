import assert from 'node:assert/strict'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'birlanu',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const loadBirlaNuModule = async () => {
  try {
    return await import('../../scraper/birlanu/script.js')
  } catch {
    assert.fail('Expected BirlaNu scraper module at ../../scraper/birlanu/script.js')
  }
}

test('BirlaNu scraper validates the verified first-party people page and current Darwinbox handoff', async () => {
  const birlaNu = await loadBirlaNuModule()
  const peoplePageHtml = readFixture('people-page.html')

  assert.equal(birlaNu.SOURCE, 'birlanu')
  assert.equal(birlaNu.COMPANY, 'BirlaNu')
  assert.equal(birlaNu.HOMEPAGE_URL, 'https://birlanu.com/')
  assert.equal(birlaNu.CAREERS_URL, 'https://birlanu.com/people')
  assert.equal(
    birlaNu.VERIFIED_HANDOFF_URL,
    'https://iconnect-hil.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(birlaNu.hasOfficialCareersSignal(peoplePageHtml), true)
  assert.equal(
    birlaNu.extractJoinUsUrl(peoplePageHtml),
    'https://iconnect-hil.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(birlaNu.pageExposesFirstPartyJobRecords(peoplePageHtml), false)

  const requestedUrls = []
  const jobs = await birlaNu.createBirlaNuScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === birlaNu.CAREERS_URL) return peoplePageHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [birlaNu.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('BirlaNu scraper fails closed when the verified handoff changes or first-party job cards appear', async () => {
  const birlaNu = await loadBirlaNuModule()
  const peoplePageHtml = readFixture('people-page.html')
  const firstPartyJobsHtml = readFixture('people-page-first-party-jobs.html')

  await assert.rejects(
    birlaNu.createBirlaNuScraper().run({
      fetchText: async (url) => {
        if (url === birlaNu.CAREERS_URL) {
          return peoplePageHtml.replace(
            'https://iconnect-hil.darwinbox.in/ms/candidatev2/main/careers/allJobs',
            'https://birlanu.com/careers/openings',
          )
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified .* handoff/i,
  )

  await assert.rejects(
    birlaNu.createBirlaNuScraper().run({
      fetchText: async (url) => {
        if (url === birlaNu.CAREERS_URL) return firstPartyJobsHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /first-party public job records/i,
  )
})
