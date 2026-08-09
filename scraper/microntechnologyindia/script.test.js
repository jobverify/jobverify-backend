import assert from 'node:assert/strict'
import test from 'node:test'

import {
  OFFICIAL_CAREERS_URL,
  SEARCH_PAGE_SIZE,
  buildDetailApiUrl,
  buildListingApiUrl,
  createMicronTechnologyIndiaScraper,
  hasOfficialMicronIndiaCareersSignal,
} from './script.js'

const CAREERS_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Careers | Micron India</title>
</head>
<body>
  <section>Micron India is growing in Hyderabad.</section>
  <a href="https://micron.eightfold.ai/careers?location=India&domain=micron.com">Search current jobs</a>
</body>
</html>`

const buildDetailPayload = (jobId) => ({
  data: {
    positionId: String(jobId),
    jobDescription: 'Requires 5+ years of experience building production silicon systems.',
  },
})

const withMockedMicronDetailFetch = async (runTest) => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (url) => {
    const detailUrl = String(url)
    if (!/\/api\/pcsx\/position_details\b/i.test(detailUrl)) {
      throw new Error(`Unexpected network fetch: ${detailUrl}`)
    }

    const positionId = new URL(detailUrl).searchParams.get('position_id') || 'unknown'

    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify(buildDetailPayload(positionId)),
    }
  }

  try {
    return await runTest()
  } finally {
    globalThis.fetch = originalFetch
  }
}

test('Micron Technology India builds the verified Eightfold listing URL', () => {
  assert.equal(
    buildListingApiUrl(),
    'https://careers.micron.com/api/pcsx/search?domain=micron.com&query=&location=India&start=0&limit=10',
  )
  assert.equal(SEARCH_PAGE_SIZE, 10)
})

test('Micron Technology India still verifies the first-party India careers handoff', () => {
  assert.equal(hasOfficialMicronIndiaCareersSignal(CAREERS_HTML), true)
})

test('Micron Technology India paginates through 10-job Eightfold result pages', async () => {
  const scraper = createMicronTechnologyIndiaScraper()
  const seenApiUrls = []

  const makePosition = (index) => ({
    id: 5000 + index,
    displayJobId: `JR${9000 + index}`,
    name: `Engineer ${index}`,
    locations: ['Hyderabad, Telangana, India'],
    positionUrl: `/careers/job/${5000 + index}`,
    department: 'Engineering',
    postedTs: `2026-08-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
  })

  const listingResponses = new Map([
    ['0', {
      data: {
        count: 13,
        positions: Array.from({ length: 10 }, (_, index) => makePosition(index + 1)),
      },
    }],
    ['10', {
      data: {
        count: 13,
        positions: Array.from({ length: 3 }, (_, index) => makePosition(index + 11)),
      },
    }],
  ])

  const jobs = await scraper.run({
    fetchText: async (url) => {
      assert.equal(url, OFFICIAL_CAREERS_URL)
      return CAREERS_HTML
    },
    fetchJson: async (url) => {
      const parsedUrl = new URL(url)
      seenApiUrls.push(url)

      if (/\/api\/pcsx\/position_details\b/i.test(parsedUrl.pathname)) {
        return buildDetailPayload(parsedUrl.searchParams.get('position_id'))
      }

      const start = parsedUrl.searchParams.get('start')
      const limit = parsedUrl.searchParams.get('limit')

      assert.equal(limit, String(SEARCH_PAGE_SIZE))

      const payload = listingResponses.get(start)
      if (!payload) {
        throw new Error(`Unexpected listing page start=${start}`)
      }

      return payload
    },
  })

  assert.deepEqual(
    seenApiUrls,
    [
      'https://careers.micron.com/api/pcsx/search?domain=micron.com&query=&location=India&start=0&limit=10',
      ...Array.from({ length: 10 }, (_, index) => buildDetailApiUrl(5001 + index)),
      'https://careers.micron.com/api/pcsx/search?domain=micron.com&query=&location=India&start=10&limit=10',
      ...Array.from({ length: 3 }, (_, index) => buildDetailApiUrl(5011 + index)),
    ],
  )
  assert.equal(jobs.length, 13)
  assert.deepEqual(
    jobs.slice(0, 2).map((job) => ({
      title: job.title,
      location: job.location,
      sourceUrl: job.sourceUrl,
    })),
    [
      {
        title: 'Engineer 1',
        location: 'Hyderabad, Telangana, India',
        sourceUrl: 'https://careers.micron.com/careers/job/5001',
      },
      {
        title: 'Engineer 2',
        location: 'Hyderabad, Telangana, India',
        sourceUrl: 'https://careers.micron.com/careers/job/5002',
      },
    ],
  )
})

test('Micron Technology India keeps successful jobs when its owned browser session reports Target closed while closing', async () => {
  const closeError = new Error('Protocol error (Runtime.callFunctionOn): Target closed')
  const scraper = createMicronTechnologyIndiaScraper({
    createBrowserFetchSessionImpl: async () => ({
      fetchText: async () => JSON.stringify({
        data: {
          count: 1,
          positions: [
            {
              id: 6001,
              displayJobId: 'JR96001',
              name: 'Principal Engineer',
              locations: ['Hyderabad, Telangana, India'],
              positionUrl: '/careers/job/6001',
              department: 'Engineering',
              postedTs: '2026-08-04T10:00:00Z',
            },
          ],
        },
      }),
      close: async () => {
        throw closeError
      },
    }),
  })

  const jobs = await withMockedMicronDetailFetch(async () => scraper.run({
    fetchText: async () => CAREERS_HTML,
  }))

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Principal Engineer')
  assert.equal(jobs[0].sourceUrl, 'https://careers.micron.com/careers/job/6001')
})

test('Micron Technology India uses the shared browser text fetch with the India landing page when live browser auth is required', async () => {
  const calls = []
  const scraper = createMicronTechnologyIndiaScraper({
    createBrowserFetchSessionImpl: async () => ({
      fetchText: async (url, options) => {
        calls.push({ url, options })
        return JSON.stringify({
          data: {
            count: 1,
            positions: [
              {
                id: 7001,
                displayJobId: 'JR97001',
                name: 'STAFF ENG-HIG-HBM-LAYOUT',
                locations: ['Hyderabad, Telangana, India'],
                positionUrl: '/careers/job/7001',
                department: 'Engineering',
                postedTs: '2026-08-04T10:00:00Z',
              },
            ],
          },
        })
      },
      close: async () => {},
    }),
  })

  const jobs = await withMockedMicronDetailFetch(async () => scraper.run({
    fetchText: async () => CAREERS_HTML,
  }))

  assert.equal(jobs.length, 1)
  assert.deepEqual(calls, [
    {
      url: 'https://careers.micron.com/api/pcsx/search?domain=micron.com&query=&location=India&start=0&limit=10',
      options: {
        referer: 'https://careers.micron.com/careers?domain=micron.com&location=India',
      },
    },
  ])
})

test('Micron Technology India recreates its browser session after a transient aborted navigation', async () => {
  let sessionCreations = 0
  const scraper = createMicronTechnologyIndiaScraper({
    createBrowserFetchSessionImpl: async () => {
      sessionCreations += 1

      if (sessionCreations === 1) {
        return {
          fetchText: async () => {
            throw new Error('net::ERR_ABORTED at https://careers.micron.com/api/pcsx/search')
          },
          close: async () => {},
        }
      }

      return {
        fetchText: async () => JSON.stringify({
          data: {
            count: 1,
            positions: [
              {
                id: 8001,
                displayJobId: 'JR98001',
                name: 'Staff Engineer',
                locations: ['Hyderabad, Telangana, India'],
                positionUrl: '/careers/job/8001',
                department: 'Engineering',
                postedTs: '2026-08-04T10:00:00Z',
              },
            ],
          },
        }),
        close: async () => {},
      }
    },
  })

  const jobs = await withMockedMicronDetailFetch(async () => scraper.run({
    fetchText: async () => CAREERS_HTML,
  }))

  assert.equal(sessionCreations, 2)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Staff Engineer')
  assert.equal(jobs[0].sourceUrl, 'https://careers.micron.com/careers/job/8001')
})
