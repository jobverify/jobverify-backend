import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  LEVER_BOARD_URL,
  run,
} from '../../scraper/verygoodsecurityindia/script.js'

const careersHtml = `
  <html><head><title>Careers | VGS</title></head><body>
    <h1>It Takes Exceptional People to Build VGS</h1>
    <a href="#lever-jobs-container">View All Open Roles</a>
    <h2>What We Look For In Every Teammate</h2>
    <p>We're a remote-first company looking for passionate professionals.</p>
    <section class="lever-jobs"><div id="lever-jobs-container"></div>
      <h2>Discover Opportunities</h2></section>
  </body></html>
`

const boardHtml = `
  <html><head><title>VGS</title>
    <meta property="og:url" content="https://jobs.lever.co/verygoodsecurity">
  </head><body><p>Location type Location Team Work type</p>
    <a href="https://jobs.lever.co/verygoodsecurity/us-role">Apply</a>
    <p>Powered by Lever</p>
  </body></html>
`

test('Very Good Security India returns zero when the verified Lever inventory has no India roles', async () => {
  const jobs = await run({
    fetchText: async (url) => url === CAREERS_URL ? careersHtml : boardHtml,
    fetchJson: async () => [{
      id: 'us-role',
      text: 'Strategic Finance Manager',
      country: 'US',
      hostedUrl: 'https://jobs.lever.co/verygoodsecurity/us-role',
      categories: { location: 'United States / Canada' },
    }],
  })
  assert.deepEqual(jobs, [])
})

test('Very Good Security India rejects stale careers copy and mismatched Lever identity', async () => {
  await assert.rejects(
    run({ fetchText: async () => '<h1>It Takes Exceptional People to Create VGS</h1>' }),
    /official careers/i,
  )
  await assert.rejects(
    run({
      fetchText: async (url) => url === LEVER_BOARD_URL
        ? '<title>Another company</title>'
        : careersHtml,
    }),
    /Lever board/i,
  )
})
