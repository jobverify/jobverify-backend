import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, '../../scraper/amberenterprises/fixtures')

const loadAmberEnterprisesModule = async () => {
  try {
    return await import('../../scraper/amberenterprises/script.js')
  } catch {
    assert.fail('Expected Amber Enterprises scraper module at ../../scraper/amberenterprises/script.js')
  }
}

const readFixture = async (name) => readFile(path.join(fixturesDir, name), 'utf8')

test('Amber Enterprises validates the verified official homepage and careers handoff before returning no first-party listings', async () => {
  const amberEnterprises = await loadAmberEnterprisesModule()
  const homepageHtml = await readFixture('homepage.html')
  const careersHtml = await readFixture('careers.html')
  const requestedUrls = []

  assert.equal(amberEnterprises.SOURCE, 'amberenterprises')
  assert.equal(amberEnterprises.COMPANY, 'Amber Enterprises')
  assert.equal(amberEnterprises.HOMEPAGE_URL, 'https://www.ambergroupindia.com/')
  assert.equal(amberEnterprises.CAREERS_URL, 'https://www.ambergroupindia.com/careers/')
  assert.equal(amberEnterprises.EXTERNAL_JOBS_HOST, 'www.naukri.com')
  assert.equal(amberEnterprises.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(amberEnterprises.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(amberEnterprises.hasExternalJobsHandoffSignal(careersHtml), true)

  const jobs = await amberEnterprises.createAmberEnterprisesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === amberEnterprises.HOMEPAGE_URL) return homepageHtml
      if (url === amberEnterprises.CAREERS_URL) return careersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.ambergroupindia.com/',
    'https://www.ambergroupindia.com/careers/',
  ])
  assert.deepEqual(jobs, [])
})

test('Amber Enterprises accepts the current first-party homepage title variant', async () => {
  const amberEnterprises = await loadAmberEnterprisesModule()

  assert.equal(
    amberEnterprises.hasOfficialHomepageSignal(`
      <html>
        <head><title>Amber Group India | AC, Mobility Solutions Manufacturer</title></head>
        <body><a href="/careers/">Careers</a><p>Mobility Solutions</p></body>
      </html>
    `),
    true,
  )
})

test('Amber Enterprises fails closed when the verified homepage or careers handoff changes', async () => {
  const amberEnterprises = await loadAmberEnterprisesModule()
  const careersHtml = await readFixture('careers.html')

  await assert.rejects(
    amberEnterprises.createAmberEnterprisesScraper().run({
      fetchText: async (url) => {
        if (url === amberEnterprises.HOMEPAGE_URL) {
          return '<html><head><title>Unexpected</title></head><body>No brand markers</body></html>'
        }

        if (url === amberEnterprises.CAREERS_URL) {
          return careersHtml
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    amberEnterprises.createAmberEnterprisesScraper().run({
      fetchText: async (url) => {
        if (url === amberEnterprises.HOMEPAGE_URL) {
          return await readFixture('homepage.html')
        }

        if (url === amberEnterprises.CAREERS_URL) {
          return `
            <!doctype html>
            <html lang="en">
              <head>
                <title>Careers at Amber Group | Let's Innovate for a Better Tomorrow</title>
              </head>
              <body>
                <a href="https://www.ambergroupindia.com/careers/">Careers</a>
                <p>View Current Openings</p>
                <p>Upload Resume</p>
                <input type="file" name="resume" />
              </body>
            </html>
          `
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers handoff/i,
  )
})

test('Amber Enterprises can recover with browser-backed first-party pages when direct requests time out', async () => {
  const amberEnterprises = await loadAmberEnterprisesModule()
  const homepageHtml = await readFixture('homepage.html')
  const careersHtml = await readFixture('careers.html')
  const browserUrls = []

  const jobs = await amberEnterprises.createAmberEnterprisesScraper().run({
    fetchText: async () => {
      throw new TypeError('fetch failed')
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)

      if (url === amberEnterprises.HOMEPAGE_URL) return homepageHtml
      if (url === amberEnterprises.CAREERS_URL) return careersHtml

      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(browserUrls, [
    amberEnterprises.HOMEPAGE_URL,
    amberEnterprises.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})
