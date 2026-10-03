import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createHomeFirstFinanceCompanyHffcScraper,
  JOB_LISTING_URL,
  JOBS_API_URL,
} from './script.js'

const SHELL = `
  <title>Easy Home Loans | Affordable Home Loan in India|HFFC Home Loan</title>
  <meta name="description" content="Home First Finance Company India (HFFC) is a Housing Finance Company" />
  <meta property="og:site_name" content="Home First" />
  <base href="/">
  <app-root id="main-root"></app-root>
  <script src="main-FU6BUITR.js" type="module"></script>
`

const ACTIVE = {
  id: '024cc2db-59bb-479b-99e2-a56b00d7f4c6',
  active: true,
  city: { name: 'Kadapa' },
  state: { name: 'Andhra Pradesh' },
  startDatetime: '2024-05-21 12:06:48',
  endDatetime: '2024-08-21 12:06:48',
  job: {
    id: '14a38345-56d6-40d8-80e7-ca8a28c41e05',
    position: 'Customer Service',
    jobType: 'Freshers',
    department: 'Operation',
    description: 'Help customers complete loan transactions.',
    workModel: 'Work from office',
  },
}

test('Home First reads active roles from the public API linked by its current app', async () => {
  const requested = []
  const jobs = await createHomeFirstFinanceCompanyHffcScraper({ now: () => '2026-10-03T00:00:00.000Z' }).run({
    fetchText: async (url) => {
      requested.push(url)
      return SHELL
    },
    fetchJson: async (url) => {
      requested.push(url)
      return { JobList: [ACTIVE, { ...ACTIVE, id: 'inactive', active: false }] }
    },
  })

  assert.deepEqual(requested, [JOB_LISTING_URL, JOBS_API_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Customer Service')
  assert.equal(jobs[0].location, 'Kadapa, Andhra Pradesh, India')
  assert.equal(jobs[0].sourceUrl, `${JOB_LISTING_URL}/job/${ACTIVE.id}`)
  assert.equal(jobs[0].applyUrl, jobs[0].sourceUrl)
  assert.equal(jobs[0].closingDate, null)
  assert.equal(jobs[0].employmentType, null)
})

test('Home First rejects incomplete active API roles', async () => {
  await assert.rejects(
    createHomeFirstFinanceCompanyHffcScraper().run({
      fetchText: async () => SHELL,
      fetchJson: async () => ({ JobList: [{ ...ACTIVE, city: null }] }),
    }),
    /incomplete active roles/i,
  )
})
