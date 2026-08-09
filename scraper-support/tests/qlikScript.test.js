import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/qlik/script.js')
  } catch {
    assert.fail('Expected Qlik scraper module at ../../scraper/qlik/script.js')
  }
}

test('Qlik surfaces a 403 from the Eightfold API instead of recovering through a browser', async () => {
  const qlik = await loadModule()
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    headers: new Headers(),
  })

  try {
    await assert.rejects(
      qlik.defaultFetchJson('https://careerhub.qlik.com/api/pcsx/search?domain=qlik.com', {
        attempts: 1,
        baseDelayMs: 0,
      }),
      /HTTP 403 for https:\/\/careerhub\.qlik\.com\/api\/pcsx\/search\?domain=qlik\.com/,
    )
  } finally {
    globalThis.fetch = originalFetch
  }
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
