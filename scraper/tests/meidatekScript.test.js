import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  CAREERS_PAGE_URL,
  buildDetailUrl,
  createMediatekScraper,
} from '../mediatek/script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name) => readFile(path.join(currentDir, 'fixtures', 'mediatek', name), 'utf8')

test('Meidatek alias recommendation depends on the existing official MediaTek careers surface staying stable', async () => {
  const [listingsHtml, indiaDetailHtml, taiwanDetailHtml] = await Promise.all([
    fixture('listings.html'),
    fixture('MTB120250718000.html'),
    fixture('MTB120250719000.html'),
  ])
  const requestedUrls = []
  const scraper = createMediatekScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_PAGE_URL) return listingsHtml
      if (url === buildDetailUrl('MTB120250718000')) return indiaDetailHtml
      if (url === buildDetailUrl('MTB120250719000')) return taiwanDetailHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    CAREERS_PAGE_URL,
    buildDetailUrl('MTB120250718000'),
    buildDetailUrl('MTB120250719000'),
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'mediatek')
  assert.equal(jobs[0].company, 'MediaTek')
  assert.equal(jobs[0].location, 'Hyderabad, India')
  assert.equal(jobs[0].link, 'https://careers.mediatek.com/eREC/JobSearch/JobDetail/MTB120250718000')
})
