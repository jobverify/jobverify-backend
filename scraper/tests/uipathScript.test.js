import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ASHBY_JOB_BOARD_URL,
  createUiPathScraper,
} from '../uipath/script.js'

const fixtureUrl = new URL('./fixtures/uipath/public-jobs.json', import.meta.url)

test('run reads UiPath\'s public Ashby board and returns only listed India jobs', async () => {
  const requestedUrls = []
  const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'))
  const scraper = createUiPathScraper()

  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      return fixture
    },
  })

  assert.deepEqual(requestedUrls, [ASHBY_JOB_BOARD_URL])
  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    city: job.city,
    country: job.country,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    source: job.source,
  })), [
    {
      title: 'Senior Software Engineer',
      city: 'Bengaluru',
      country: 'India',
      sourceUrl: 'https://jobs.ashbyhq.com/uipath/india-primary',
      applyUrl: 'https://jobs.ashbyhq.com/uipath/india-primary/application',
      source: 'uipath',
    },
    {
      title: 'Solutions Architect',
      city: 'Mumbai',
      country: 'India',
      sourceUrl: 'https://jobs.ashbyhq.com/uipath/india-secondary',
      applyUrl: 'https://jobs.ashbyhq.com/uipath/india-secondary/application',
      source: 'uipath',
    },
  ])
})
