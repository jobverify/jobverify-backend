import assert from 'node:assert/strict'
import test from 'node:test'

import { createGrouponScraper, hasOfficialCareersSignal } from '../../scraper/groupon/script.js'

const careers = '<html><head><title>Groupon Careers</title><meta name="description" content="Join Groupon — explore open roles, meet our teams, and discover why Groupon is the place to build." /><script type="module" crossorigin src="/assets/index-B_T_KCkt.js"></script></head><body><div id="root"></div></body></html>'
const board = '<html><head><title>Jobs at Groupon</title><meta content="Learn more about&amp;nbsp;&lt;a href=&quot;https://www.grouponcareers.com&quot;&gt;life at Groupon&lt;/a&gt;" /></head><body><a href="https://job-boards.eu.greenhouse.io/groupon/jobs/4979605101">Sales role</a></body></html>'
const job = { id: 4979605101, title: 'Sales role', location: { name: 'Bangalore (Gopalan Axis SEZ)' }, absolute_url: 'https://job-boards.eu.greenhouse.io/groupon/jobs/4979605101', company_name: 'Groupon', content: '&lt;p&gt;Build local partnerships.&lt;/p&gt;' }

test('Groupon follows the new careers app shell to the still-linked public Greenhouse board', async () => {
  assert.equal(hasOfficialCareersSignal(careers), true)
  const calls = []
  const jobs = await createGrouponScraper().run({
    fetchText: async (url) => {
      calls.push(url)
      return url === 'https://www.grouponcareers.com/' ? careers : board
    },
    fetchJson: async (url) => {
      calls.push(url)
      return { jobs: [job] }
    },
  })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Sales role')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].applyUrl, job.absolute_url)
  assert.deepEqual(calls, [
    'https://www.grouponcareers.com/',
    'https://job-boards.eu.greenhouse.io/groupon',
    'https://boards-api.greenhouse.io/v1/boards/groupon/jobs?content=true',
  ])
})

test('Groupon rejects a board that no longer links back to its first-party careers domain', async () => {
  await assert.rejects(createGrouponScraper().run({
    fetchText: async (url) => url === 'https://www.grouponcareers.com/' ? careers : board.replaceAll('www.grouponcareers.com', 'example.com'),
    fetchJson: async () => ({ jobs: [job] }),
  }), /first-party careers domain/i)
})
