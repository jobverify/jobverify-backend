import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  DARWINBOX_ORIGIN,
  OFFICIAL_CAREERS_HANDOFF_URL,
  PUBLIC_ALL_JOBS_URL,
  createMobiKwikScraper,
  extractDarwinboxHandoffUrl,
  hasExternalJobsHandoffSignal,
  hasOfficialCareersSignal,
} from '../../scraper/mobikwik/script.js'

const FIXED_SCRAPED_AT = '2026-08-01T00:00:00.000Z'

const officialCareersSurface = {
  title: 'MobiKwik Careers: Join Our Team',
  text: `
    Want to empower millions of Indians with financial Independence?
    View Job Openings
    About Us
    We are a publicly listed fintech company and the home to India's largest digital wallet.
    There's a lot to love at MobiKwik.
  `,
  anchors: [
    { href: OFFICIAL_CAREERS_HANDOFF_URL, text: 'View Job Openings' },
    { href: 'https://www.linkedin.com/company/mobikwik', text: '' },
  ],
}

test('MobiKwik validates the rendered careers surface and Darwinbox handoff before scraping jobs', async () => {
  const requestedUrls = []
  const delegatedJobs = [
    {
      title: 'DBA I',
      company: COMPANY,
      location: 'Gurgaon, Haryana , India',
      source: 'mobikwik',
      link: 'https://mobikwik.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a68c3faf671c7d',
    },
  ]
  const runCalls = []

  assert.equal(DARWINBOX_ORIGIN, 'https://mobikwik.darwinbox.in')
  assert.equal(PUBLIC_ALL_JOBS_URL, 'https://mobikwik.darwinbox.in/ms/candidatev2/main/careers/allJobs')
  assert.equal(hasOfficialCareersSignal(officialCareersSurface), true)
  assert.equal(hasExternalJobsHandoffSignal(officialCareersSurface), true)
  assert.equal(extractDarwinboxHandoffUrl(officialCareersSurface), OFFICIAL_CAREERS_HANDOFF_URL)

  const jobs = await createMobiKwikScraper({
    now: () => FIXED_SCRAPED_AT,
    darwinboxScraper: {
      run: async (options) => {
        runCalls.push(options)
        return delegatedJobs
      },
    },
  }).run({
    maxPages: 1,
    maxJobs: 1,
    loadRenderedCareersSurface: async (url) => {
      requestedUrls.push(url)
      return officialCareersSurface
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_URL])
  assert.deepEqual(runCalls, [{ maxPages: 1, maxJobs: 1 }])
  assert.deepEqual(jobs, [
    {
      ...delegatedJobs[0],
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('MobiKwik fails closed when the rendered careers surface changes', async () => {
  await assert.rejects(
    createMobiKwikScraper().run({
      loadRenderedCareersSurface: async () => ({
        title: 'Unexpected',
        text: 'No career details here.',
        anchors: [],
      }),
    }),
    /MobiKwik official careers surface changed/i,
  )

  await assert.rejects(
    createMobiKwikScraper().run({
      loadRenderedCareersSurface: async () => ({
        ...officialCareersSurface,
        anchors: [{ href: 'https://example.com/jobs', text: 'View Job Openings' }],
      }),
    }),
    /MobiKwik careers handoff changed/i,
  )
})
