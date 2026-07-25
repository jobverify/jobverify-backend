import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadCourtclikModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Courtclik scraper module at ./script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const homepageHtml = fs.readFileSync(path.join(currentDir, 'fixtures/homepage.html'), 'utf8')
const careersHtml = fs.readFileSync(path.join(currentDir, 'fixtures/careers.html'), 'utf8')

test('Courtclik scraper validates the verified homepage and zero-openings careers surface', async () => {
  const courtclik = await loadCourtclikModule()

  assert.equal(courtclik.SOURCE, 'courtclik')
  assert.equal(courtclik.COMPANY, 'Courtclik')
  assert.equal(courtclik.HOMEPAGE_URL, 'https://www.courtclick.com/')
  assert.equal(courtclik.CAREERS_URL, 'https://www.courtclick.com/career')
  assert.equal(courtclik.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(courtclik.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(courtclik.hasZeroRolesEmptyState(careersHtml), true)
  assert.equal(courtclik.hasUnexpectedPublicJobsSignal(careersHtml), false)
})

test('Courtclik scraper returns no jobs while the verified homepage and careers page remain stable', async () => {
  const courtclik = await loadCourtclikModule()
  const requestedUrls = []

  const jobs = await courtclik.createCourtclikScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === courtclik.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === courtclik.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [courtclik.HOMEPAGE_URL, courtclik.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Courtclik default page fetches are bounded with abort signals', async () => {
  const courtclik = await loadCourtclikModule()
  const originalFetch = globalThis.fetch
  const requests = []

  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), signal: init.signal })

    if (url === courtclik.HOMEPAGE_URL) {
      return { status: 200, url, text: async () => homepageHtml }
    }
    if (url === courtclik.CAREERS_URL) {
      return { status: 200, url, text: async () => careersHtml }
    }

    assert.fail(`Unexpected Courtclik URL: ${url}`)
  }

  try {
    const jobs = await courtclik.createCourtclikScraper().run()

    assert.deepEqual(jobs, [])
    assert.ok(requests.every((request) => request.signal), 'each fetch should include an abort signal')
    assert.ok(requests.every((request) => typeof request.signal.aborted === 'boolean'))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Courtclik scraper fails closed when the homepage or careers zero-openings surface drifts', async () => {
  const courtclik = await loadCourtclikModule()

  await assert.rejects(
    courtclik.createCourtclikScraper().run({
      fetchPage: async (url) => {
        if (url === courtclik.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Unexpected</title></head><body></body></html>',
          }
        }

        return { status: 200, url, html: careersHtml }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    courtclik.createCourtclikScraper().run({
      fetchPage: async (url) => {
        if (url === courtclik.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        return {
          status: 200,
          url,
          html: careersHtml.replace(
            'No roles found',
            '<a href="https://jobs.lever.co/courtclick">Apply now</a>',
          ),
        }
      },
    }),
    /zero-openings|public jobs/i,
  )

  await assert.rejects(
    courtclik.createCourtclikScraper().run({
      fetchPage: async (url) => {
        if (url === courtclik.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        return {
          status: 200,
          url,
          html: careersHtml.replace(
            'Careers at Court Click - Join Our Legal-Tech Team | Court Click',
            'Unexpected careers page',
          ),
        }
      },
    }),
    /verified official careers/i,
  )
})
