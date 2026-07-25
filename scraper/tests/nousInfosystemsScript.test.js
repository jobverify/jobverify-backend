import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../nousinfosystems/fixtures',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readFixture('homepage.html')
const verifiedCareersHtml = readFixture('careers.html')
const verifiedBundleJs = readFixture('bundle.js')

const loadModule = async () => {
  try {
    return await import('../nousinfosystems/script.js')
  } catch {
    assert.fail('Expected Nous Infosystems scraper module at ../nousinfosystems/script.js')
  }
}

test('Nous Infosystems validates the verified legacy-domain redirect, Artizent careers shell, and contact-only careers bundle contract', async () => {
  const nousInfosystems = await loadModule()

  assert.equal(nousInfosystems.SOURCE, 'nousinfosystems')
  assert.equal(nousInfosystems.COMPANY, 'Nous Infosystems')
  assert.equal(nousInfosystems.LEGACY_HOMEPAGE_URL, 'https://www.nousinfosystems.com/')
  assert.equal(nousInfosystems.HOMEPAGE_REDIRECT_URL, 'https://www.artizent.com/')
  assert.equal(nousInfosystems.CAREERS_URL, 'https://www.artizent.com/insights/careers')
  assert.equal(nousInfosystems.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(nousInfosystems.hasPublicJobsSignal(verifiedHomepageHtml), false)
  assert.equal(nousInfosystems.extractBundleAssetPath(verifiedHomepageHtml), '/assets/index-DhmwtBqm.js')
  assert.equal(
    nousInfosystems.isVerifiedHomepageRedirect({
      status: 200,
      url: nousInfosystems.HOMEPAGE_REDIRECT_URL,
      html: verifiedHomepageHtml,
    }),
    true,
  )
  assert.equal(
    nousInfosystems.routeMatchesVerifiedShell(
      verifiedCareersHtml,
      nousInfosystems.extractBundleAssetPath(verifiedHomepageHtml),
    ),
    true,
  )
  assert.equal(nousInfosystems.hasVerifiedBundleSignal(verifiedBundleJs), true)
})

test('Nous Infosystems returns no jobs only while the verified redirect, careers shell, and contact-only bundle contract remain unchanged', async () => {
  const nousInfosystems = await loadModule()
  const requestedPages = []
  const requestedText = []

  const jobs = await nousInfosystems.createNousInfosystemsScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === nousInfosystems.LEGACY_HOMEPAGE_URL) {
        return {
          status: 200,
          url: nousInfosystems.HOMEPAGE_REDIRECT_URL,
          html: verifiedHomepageHtml,
        }
      }

      if (url === nousInfosystems.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: verifiedCareersHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchText: async (url) => {
      requestedText.push(url)

      if (url === 'https://www.artizent.com/assets/index-DhmwtBqm.js') {
        return verifiedBundleJs
      }

      throw new Error(`Unexpected text URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [
    nousInfosystems.LEGACY_HOMEPAGE_URL,
    nousInfosystems.CAREERS_URL,
  ])
  assert.deepEqual(requestedText, ['https://www.artizent.com/assets/index-DhmwtBqm.js'])
  assert.deepEqual(jobs, [])
})

test('Nous Infosystems fails closed when the redirect target, careers shell, or contact-only bundle contract changes', async () => {
  const nousInfosystems = await loadModule()

  await assert.rejects(
    nousInfosystems.createNousInfosystemsScraper().run({
      fetchPage: async (url) => {
        if (url === nousInfosystems.LEGACY_HOMEPAGE_URL) {
          return {
            status: 200,
            url: 'https://www.nousinfosystems.com/',
            html: verifiedHomepageHtml,
          }
        }

        return {
          status: 200,
          url,
          html: verifiedCareersHtml,
        }
      },
      fetchText: async () => verifiedBundleJs,
    }),
    /legacy homepage redirect/i,
  )

  await assert.rejects(
    nousInfosystems.createNousInfosystemsScraper().run({
      fetchPage: async (url) => {
        if (url === nousInfosystems.LEGACY_HOMEPAGE_URL) {
          return {
            status: 200,
            url: nousInfosystems.HOMEPAGE_REDIRECT_URL,
            html: verifiedHomepageHtml,
          }
        }

        return {
          status: 200,
          url,
          html: '<html><body><h1>Careers</h1><a href="/jobs/platform-engineer">Apply now</a></body></html>',
        }
      },
      fetchText: async () => verifiedBundleJs,
    }),
    /careers route changed materially or now exposes public jobs/i,
  )

  await assert.rejects(
    nousInfosystems.createNousInfosystemsScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url: url === nousInfosystems.LEGACY_HOMEPAGE_URL
          ? nousInfosystems.HOMEPAGE_REDIRECT_URL
          : url,
        html: url === nousInfosystems.LEGACY_HOMEPAGE_URL
          ? verifiedHomepageHtml
          : verifiedCareersHtml,
      }),
      fetchText: async () =>
        'path:"/insights/careers",component:$W function $W(){return s.jsx("a",{href:"https://jobs.ashbyhq.com/artizent",children:"Apply now"})}',
    }),
    /client bundle changed materially or no longer confirms the verified contact-only careers contract/i,
  )
})
