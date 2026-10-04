import assert from 'node:assert/strict'
import test from 'node:test'

import { createBillEaseScraper } from './script.js'

const careers = `<html><head><title>Careers at Billease | Join our team</title>
<link rel="canonical" href="https://billease.ph/careers/"></head><body>
<h1>Careers at Billease</h1><p>2 open roles</p>
<a href="https://billease.careers-page.com/">Open roles</a>
<script src="/careers/_payload.json?_b=fixture"></script>
</body></html>`
const payload = [
  { data: 1 }, ['ShallowReactive', 2], { 'billease-career-jobs': 3 },
  { jobs: 4, failed: 18 }, [5, 11],
  { id: 6, title: 7, location: 8, url: 9 },
  '11111111-1111-4111-8111-111111111111', 'Sales Associate', 'Philippines',
  'https://billease.careers-page.com/jobs/11111111-1111-4111-8111-111111111111',
  null,
  { id: 12, title: 13, location: 14, url: 15 },
  '22222222-2222-4222-8222-222222222222', 'Risk Analyst',
  'Makati City, Metro Manila, Philippines',
  'https://billease.careers-page.com/jobs/22222222-2222-4222-8222-222222222222',
  null, null, false,
]

test('BillEase verifies every first-party role before returning zero India jobs', async () => {
  const requested = []
  const jobs = await createBillEaseScraper().run({
    fetchText: async () => careers,
    fetchJson: async (url) => { requested.push(url); return payload },
  })
  assert.deepEqual(requested, ['https://billease.ph/careers/_payload.json?_b=fixture'])
  assert.deepEqual(jobs, [])
})

test('BillEase fails closed if a current role is in India', async () => {
  const withIndia = [...payload]
  withIndia[14] = 'Bengaluru, India'
  await assert.rejects(createBillEaseScraper().run({
    fetchText: async () => careers,
    fetchJson: async () => withIndia,
  }), /India role/i)
})
