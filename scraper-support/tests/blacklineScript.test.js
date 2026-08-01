import assert from 'node:assert/strict'
import test from 'node:test'

import { createBlackLineScraper } from '../../scraper/blackline/script.js'

const INDIA_LOCATION_FACET_ID = '9574f3b33005100115a9633a90c20000'

const createPosting = (id) => ({
  title: `Software Engineer ${id}`,
  externalPath: `/job/Bengaluru/Software-Engineer_${id}`,
  locationsText: 'Bengaluru',
})

test('BlackLine tolerates a trailing Workday page that incorrectly reports total zero', async () => {
  const pageOnePostings = Array.from({ length: 20 }, (_, index) => (
    createPosting(String(index + 1).padStart(6, '0'))
  ))
  const pageTwoPostings = [createPosting('000021')]
  const responses = [
    {
      total: 116,
      jobPostings: [],
      facets: [
        {
          facetParameter: 'locationMainGroup',
          values: [
            {
              facetParameter: 'locations',
              values: [
                {
                  id: INDIA_LOCATION_FACET_ID,
                  descriptor: 'Bengaluru',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      total: 21,
      jobPostings: pageOnePostings,
    },
    {
      total: 0,
      jobPostings: pageTwoPostings,
    },
  ]
  const scraper = createBlackLineScraper({
    now: () => '2026-07-25T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    fetchJobsPage: async () => {
      const next = responses.shift()
      if (!next) throw new Error('Unexpected extra Workday page request')
      return next
    },
  })

  assert.equal(jobs.length, 21)
  assert.equal(jobs[0].company, 'BlackLine')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[20].jobId, '000021')
})
