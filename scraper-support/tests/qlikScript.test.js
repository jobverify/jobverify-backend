import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/qlik/script.js')
  } catch {
    assert.fail('Expected Qlik scraper module at ../../scraper/qlik/script.js')
  }
}

test('Qlik falls back to a browser-backed loader when Node fetch times out', async () => {
  const qlik = await loadModule()

  assert.equal(typeof qlik.loadWithBrowserFallback, 'function')

  const result = await qlik.loadWithBrowserFallback({
    primaryLoad: async () => {
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fallbackLoad: async (error) => ({
      data: { positions: [], count: 0 },
      recoveredFrom: String(error),
    }),
  })

  assert.deepEqual(result, {
    data: { positions: [], count: 0 },
    recoveredFrom: 'TypeError: fetch failed | Connect Timeout Error',
  })
})

test('Qlik falls back to a browser-backed loader when the search API returns 403', async () => {
  const qlik = await loadModule()

  const result = await qlik.loadWithBrowserFallback({
    primaryLoad: async () => {
      throw new Error('HTTP 403 for https://careerhub.qlik.com/api/pcsx/search?domain=qlik.com')
    },
    fallbackLoad: async (error) => ({
      data: { positions: [], count: 0 },
      recoveredFrom: String(error),
    }),
  })

  assert.deepEqual(result, {
    data: { positions: [], count: 0 },
    recoveredFrom: 'Error: HTTP 403 for https://careerhub.qlik.com/api/pcsx/search?domain=qlik.com',
  })
})

test('Qlik skips malformed India-filtered positions and keeps valid jobs', async () => {
  const qlik = await loadModule()

  const jobs = await qlik.createQlikScraper({
    pageSize: 3,
    now: () => '2026-07-31T00:00:00.000Z',
  }).run({
    fetchJson: async (url) => {
      if (url.includes('position_details')) {
        const positionId = new URL(url).searchParams.get('position_id')
        return {
          data: {
            publicUrl: `https://careerhub.qlik.com/careers/job/${positionId}`,
            jobDescription: `<p>Detail for ${positionId}</p>`,
          },
        }
      }

      return {
        data: {
          count: 3,
          positions: [
            {
              id: '1',
              displayJobId: 'REQ-1',
              name: 'Platform Engineer',
              locations: ['Bangalore, Karnataka, India'],
              department: 'Engineering',
            },
            {
              id: '2',
              displayJobId: 'REQ-2',
              name: '',
              locations: ['Bangalore, Karnataka, India'],
              department: 'Engineering',
            },
            {
              id: '3',
              displayJobId: 'REQ-3',
              name: 'Foreign Leakage',
              locations: ['Warsaw, Poland'],
              department: 'Engineering',
            },
          ],
        },
      }
    },
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, '1')
  assert.equal(jobs[0].sourceUrl, 'https://careerhub.qlik.com/careers/job/1')
})

test('Qlik recognizes India jobs when the live payload uses standardized IN country codes', async () => {
  const qlik = await loadModule()

  const jobs = await qlik.createQlikScraper({
    pageSize: 2,
    now: () => '2026-08-01T00:00:00.000Z',
  }).run({
    fetchJson: async (url) => {
      if (url.includes('position_details')) {
        const positionId = new URL(url).searchParams.get('position_id')
        return {
          data: {
            publicUrl: `https://careerhub.qlik.com/careers/job/${positionId}`,
            jobDescription: `<p>Detail for ${positionId}</p>`,
          },
        }
      }

      return {
        data: {
          count: 2,
          positions: [
            {
              id: '11',
              displayJobId: 'Q26022',
              name: 'Principal Solution Architect',
              locations: ['Delhi'],
              standardizedLocations: ['DL,IN'],
              workLocationOption: 'onsite',
            },
            {
              id: '12',
              displayJobId: 'Q26023',
              name: 'Principal Solution Architect',
              locations: ['Mumbai'],
              standardizedLocations: ['Mumbai, MH, IN'],
              workLocationOption: 'hybrid',
            },
          ],
        },
      }
    },
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({ jobId: job.jobId, location: job.location, remoteStatus: job.remoteStatus })),
    [
      { jobId: '11', location: 'Delhi', remoteStatus: 'On-site' },
      { jobId: '12', location: 'Mumbai', remoteStatus: 'Hybrid' },
    ],
  )
})
