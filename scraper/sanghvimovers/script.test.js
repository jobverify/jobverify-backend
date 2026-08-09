import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  createSanghviMoversScraper,
  defaultFetchText,
  hasPublicJobSignals,
  hasVerifiedCareersPageSignal,
} from './script.js'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Sanghvi Movers | Join Asia's Largest Crane Leader</title>
  </head>
  <body>
    <main>
      <h1>Join Our Team</h1>
      <article>
        <div>Job ID :</div>
        <div>SM-001</div>
        <div>Job Title :</div>
        <div>Lead Engineers Civil (Solar)</div>
        <div>Job Description :</div>
        <div>Lead civil engineering execution for solar projects.</div>
        <div>Key Skills :</div>
        <div>AutoCAD</div>
        <div>Project planning</div>
        <div>Work Experience (Min & Max in years) :</div>
        <div>8 - 12 years</div>
        <div>Qualification :</div>
        <div>B.E. / B.Tech Civil</div>
        <div>Job Location :</div>
        <div>PAN India</div>
        <div>No. of Positions :</div>
        <div>3</div>
        <a href="/apply">Apply Now</a>
      </article>
    </main>
  </body>
</html>
`

test('Sanghvi Movers verifier recognizes the current careers page and public job markers', () => {
  assert.equal(hasVerifiedCareersPageSignal(CAREERS_HTML), true)
  assert.equal(hasPublicJobSignals(CAREERS_HTML), true)
})

test('Sanghvi Movers default text fetch is bounded by a timeout signal', async () => {
  let capturedInit = null

  const html = await defaultFetchText(CAREERS_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        ok: true,
        status: 200,
        url,
        text: async () => '<html><body>Sanghvi Movers careers</body></html>',
      }
    },
  })

  assert.equal(html, '<html><body>Sanghvi Movers careers</body></html>')
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})

test('Sanghvi Movers uses browser fallback when the direct fetch fails on a certificate error', async () => {
  const calls = []
  const scraper = createSanghviMoversScraper({
    now: () => '2026-08-04T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      calls.push(['raw', url])
      throw new Error(`fetch failed | unable to verify the first certificate for ${url}`)
    },
    fetchBrowserText: async (url) => {
      calls.push(['browser', url])
      return CAREERS_HTML
    },
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Lead Engineers Civil (Solar)')
  assert.equal(jobs[0].location, 'PAN India')
  assert.equal(jobs[0].scrapedAt, '2026-08-04T00:00:00.000Z')
  assert.deepEqual(calls, [
    ['raw', CAREERS_URL],
    ['browser', CAREERS_URL],
  ])
})
