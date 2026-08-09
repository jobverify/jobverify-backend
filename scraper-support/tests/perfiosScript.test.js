import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_PAGE_URL,
  DARWINBOX_URL,
  createPerfiosScraper,
} from '../../scraper/perfios/script.js'

test('Perfios fails closed when its first-party careers handoff resolves to Darwinbox SSO', async () => {
  const requestedUrls = []
  const scraper = createPerfiosScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_PAGE_URL) {
        return '<a href="https://perfios.darwinbox.in">Lead with Us</a>'
      }
      return '<title>Perfios : Login</title><h3>Single sign on</h3><a>Perfios SSO</a>'
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_PAGE_URL, DARWINBOX_URL])
  assert.deepEqual(jobs, [])
})

test('Perfios refuses to assume an empty board when the stable login invariant changes', async () => {
  const scraper = createPerfiosScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => (
        url === CAREERS_PAGE_URL
          ? '<a href="https://perfios.darwinbox.in">Lead with Us</a>'
          : '<title>Perfios Careers</title><div>Current openings</div>'
      ),
    }),
    /public Darwinbox surface changed/i,
  )
})
