import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadKidventoModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Kidvento scraper module at ./script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const homepageHtml = fs.readFileSync(path.join(currentDir, 'fixtures/homepage.html'), 'utf8')
const careersHtml = fs.readFileSync(path.join(currentDir, 'fixtures/careers.html'), 'utf8')
const currentCareersHtml = `
  <html>
    <head>
      <title>Careers</title>
      <meta property="og:url" content="https://www.kidvento.com/careers">
    </head>
    <body>
      <nav>
        <a aria-selected="true" href="/careers">Careers</a>
      </nav>
      <main>
        <h1>Kidvento Careers</h1>
        <p>Dubai</p>
        <p>Bengaluru</p>
        <p>Mysuru</p>
      </main>
    </body>
  </html>
`

test('Kidvento scraper validates the verified first-party homepage and careers zero-job surface', async () => {
  const kidvento = await loadKidventoModule()

  assert.equal(kidvento.SOURCE, 'kidvento')
  assert.equal(kidvento.COMPANY, 'Kidvento Education and Research Private Limited')
  assert.equal(kidvento.HOMEPAGE_URL, 'https://www.kidvento.com/')
  assert.equal(kidvento.CAREERS_URL, 'https://www.kidvento.com/careers')
  assert.equal(kidvento.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(kidvento.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(kidvento.hasOfficialCareersSignal(currentCareersHtml), true)
  assert.deepEqual(kidvento.extractSuspiciousPublicJobLinks(careersHtml), [])
})

test('Kidvento scraper returns no jobs while the verified homepage and careers page remain stable', async () => {
  const kidvento = await loadKidventoModule()
  const requestedUrls = []

  const jobs = await kidvento.createKidventoScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === kidvento.HOMEPAGE_URL) {
        return { status: 200, url, headers: {}, html: homepageHtml }
      }

      if (url === kidvento.CAREERS_URL) {
        return { status: 200, url, headers: {}, html: careersHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [kidvento.HOMEPAGE_URL, kidvento.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Kidvento scraper fails closed when the homepage or careers zero-job surface drifts', async () => {
  const kidvento = await loadKidventoModule()

  await assert.rejects(
    kidvento.createKidventoScraper().run({
      fetchPage: async (url) => {
        if (url === kidvento.HOMEPAGE_URL) {
          return { status: 200, url, headers: {}, html: '<html><title>Unexpected</title></html>' }
        }

        return { status: 200, url, headers: {}, html: careersHtml }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    kidvento.createKidventoScraper().run({
      fetchPage: async (url) => {
        if (url === kidvento.HOMEPAGE_URL) {
          return { status: 200, url, headers: {}, html: homepageHtml }
        }

        return {
          status: 200,
          url,
          headers: {},
          html: careersHtml.replace(
            '</body>',
            '<a href="https://jobs.lever.co/kidvento">Current openings</a></body>',
          ),
        }
      },
    }),
    /public job links|public jobs surface/i,
  )

  await assert.rejects(
    kidvento.createKidventoScraper().run({
      fetchPage: async (url) => {
        if (url === kidvento.HOMEPAGE_URL) {
          return { status: 200, url, headers: {}, html: homepageHtml }
        }

        return {
          status: 200,
          url,
          headers: {},
          html: careersHtml.replace(
            'aria-selected="true" href="/careers"',
            'href="/careers/openings"',
          ),
        }
      },
    }),
    /verified official careers page|public job links|public jobs surface/i,
  )
})
