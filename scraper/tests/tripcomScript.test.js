import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildJobsRequestBody,
  createTripcomScraper,
  extractJobsFromPayload,
} from '../tripcom/script.js'

const payload = (jobs, total = jobs.length) => ({
  retCode: '201',
  retValue: { total, recruitJobAdList: jobs },
})

const sampleJob = {
  id: '29110001',
  fromId: 'MJ003700',
  jobId: 'job-1',
  jobTitle: 'Software Engineer(MJ003700)',
  publishDate: '2026-07-25',
  cityName: 'Bengaluru',
  requirements: '<p>Build Trip.com travel experiences.</p>',
  jobFamilyGroupName: 'Software development',
  buName: 'Trip.com',
  kind: 'Regular',
  kindName: 'Regular ',
  atsApiType: 'Moka_Overseas',
}

test('Trip.com maps the official India API payload to first-party job URLs', () => {
  const jobs = extractJobsFromPayload(payload([sampleJob]))

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Trip.com')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].city, 'Bengaluru')
  assert.equal(jobs[0].sourceUrl, 'https://careers.trip.com/#/job-detail?fromId=MJ003700&atsApiType=Moka_Overseas')
  assert.equal(jobs[0].jobDescription, 'Build Trip.com travel experiences.')
})

test('Trip.com requests only the enumerable official India slice and paginates it', async () => {
  const requests = []
  const jobs = await createTripcomScraper({}).run({
    now: () => '2026-07-25T00:00:00.000Z',
    fetchJson: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) })
      return requests.length === 1 ? payload([sampleJob], 2) : payload([{ ...sampleJob, id: '29110002' }], 2)
    },
  })

  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, 'https://careers.trip.com/api/oversea/getOverseaJobAd')
  assert.deepEqual(requests[0].body.condition.country, ['IND'])
  assert.equal(requests[0].body.pager.index, '1')
  assert.equal(requests[1].body.pager.index, '2')
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].companyCareerPage, 'https://careers.trip.com/')
})

test('Trip.com fails closed when the official API contract drifts', () => {
  assert.throws(() => extractJobsFromPayload({ retCode: '201', retValue: {} }), /response contract changed/i)
  assert.equal(JSON.parse(buildJobsRequestBody(1)).head.language, 'en-US')
})
