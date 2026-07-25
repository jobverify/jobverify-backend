import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'indienergy',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readFixture('homepage.html')
const verifiedCareersHtml = readFixture('careers.html')

const loadIndiEnergyModule = async () => {
  try {
    return await import('../indienergy/script.js')
  } catch {
    assert.fail('Expected Indi Energy scraper module at ../indienergy/script.js')
  }
}

test('Indi Energy sentinels recognize the verified homepage and apply-only careers shell', async () => {
  const indiEnergy = await loadIndiEnergyModule()

  assert.equal(indiEnergy.SOURCE, 'indienergy')
  assert.equal(indiEnergy.COMPANY, 'INDI ENERGY')
  assert.equal(indiEnergy.HOMEPAGE_URL, 'https://indienergy.in/')
  assert.equal(indiEnergy.CAREERS_URL, 'https://indienergy.in/careers/')
  assert.equal(indiEnergy.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(indiEnergy.hasApplyOnlyCareersSignal(verifiedCareersHtml), true)
  assert.equal(indiEnergy.hasPublicJobListingsSignal(verifiedCareersHtml), false)
  assert.equal(indiEnergy.extractCareersUrl(verifiedHomepageHtml), indiEnergy.CAREERS_URL)
})

test('Indi Energy returns no jobs only while the verified first-party apply-only shell holds', async () => {
  const indiEnergy = await loadIndiEnergyModule()
  const requestedPages = []

  const jobs = await indiEnergy.createIndiEnergyScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === indiEnergy.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          html: verifiedHomepageHtml,
        }
      }

      if (url === indiEnergy.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: verifiedCareersHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [indiEnergy.HOMEPAGE_URL, indiEnergy.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Indi Energy fails closed when the homepage or careers shell changes materially', async () => {
  const indiEnergy = await loadIndiEnergyModule()

  await assert.rejects(
    indiEnergy.createIndiEnergyScraper().run({
      fetchPage: async (url) => {
        if (url === indiEnergy.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        return { status: 200, url, html: verifiedCareersHtml }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    indiEnergy.createIndiEnergyScraper().run({
      fetchPage: async (url) => {
        if (url === indiEnergy.HOMEPAGE_URL) {
          return { status: 200, url, html: verifiedHomepageHtml }
        }

        return {
          status: 200,
          url,
          html: verifiedCareersHtml.replace(
            'Apply today',
            'Apply today Current Openings Senior Battery Engineer',
          ),
        }
      },
    }),
    /public job listings/i,
  )

  await assert.rejects(
    indiEnergy.createIndiEnergyScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: url === indiEnergy.HOMEPAGE_URL
          ? verifiedHomepageHtml
          : verifiedCareersHtml.replace('Apply today', 'Join our team'),
      }),
    }),
    /apply-only careers shell/i,
  )
})
