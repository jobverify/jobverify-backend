import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  CAREERS_PAGE_URL,
  buildDetailUrl,
  createMediatekScraper,
} from '../../scraper/mediatek/script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name) => readFile(path.join(currentDir, 'fixtures', 'mediatek', name), 'utf8')

test('MediaTek scraper enriches only discovered official jobs and retains explicit India locations', async () => {
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
  assert.deepEqual(jobs.map(({ scrapedAt, ...job }) => job), [{
    title: 'Software Engineer',
    company: 'MediaTek',
    department: 'Wireless Connectivity',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: 'MTB120250718000',
    requisitionId: 'MTB120250718000',
    sourceUrl: 'https://careers.mediatek.com/en/jobs/MTB120250718000',
    applyUrl: 'https://careers.mediatek.com/eREC/JobSearch/JobDetail/MTB120250718000',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Build and validate wireless software for MediaTek platforms.',
    source: 'mediatek',
    link: 'https://careers.mediatek.com/eREC/JobSearch/JobDetail/MTB120250718000',
  }])
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
