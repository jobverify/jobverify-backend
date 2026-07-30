import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildJobDetailUrl,
  buildSearchUrl,
  createOnsemiIndiaScraper,
  extractSearchResults,
} from './script.js'

test('onsemi India targets the verified first-party Oracle board', () => {
  assert.match(buildSearchUrl(), /hctz\.fa\.us2\.oraclecloud\.com\/hcmRestApi\/resources\/latest\/recruitingCEJobRequisitions/)
  assert.match(buildSearchUrl(), /siteNumber=CX_1001/)
  assert.equal(buildJobDetailUrl('2505563'), 'https://hctz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/2505563')
})

test('onsemi India extracts only India requisitions and preserves public URLs', () => {
  const jobs = extractSearchResults({
    items: [{
      requisitionList: [
        { Id: '1', Title: 'India Engineer', PrimaryLocation: 'Bengaluru, Karnataka, India', PrimaryLocationCountry: 'IN' },
        { Id: '2', Title: 'US Engineer', PrimaryLocation: 'Phoenix, Arizona, United States', PrimaryLocationCountry: 'US' },
      ],
    }],
  })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'onsemi India')
  assert.equal(jobs[0].sourceUrl, buildJobDetailUrl('1'))
})

test('onsemi India paginates the official finder until its reported total', async () => {
  const calls = []
  const jobs = await createOnsemiIndiaScraper({
    fetchJson: async (url) => {
      calls.push(url)
      return {
        items: [{
          Limit: 1,
          TotalJobsCount: 2,
          requisitionList: [{
            Id: String(calls.length),
            Title: `India Engineer ${calls.length}`,
            PrimaryLocation: 'Bengaluru, Karnataka, India',
            PrimaryLocationCountry: 'IN',
          }],
        }],
      }
    },
  }).run()

  assert.equal(calls.length, 2)
  assert.equal(jobs.length, 2)
})
