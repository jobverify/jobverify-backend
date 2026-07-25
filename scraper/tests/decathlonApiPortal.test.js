import assert from 'node:assert/strict'
import test from 'node:test'

import { runApiPortalScraper } from '../apiPortal/engine.js'
import { getScraperCatalog } from '../providers/index.js'

const listingsPayload = {
  count: 2,
  items: [
    {
      id: '4484711-42252177',
      job_ad_id: 4484711,
      title: 'Omni Sport Advisor',
      contract: 'Permanent contract',
      location: 'Siliguri',
      job: 'Omnichannel Sales Advisor',
      url: '4484711-omni-sport-advisor-siliguri',
    },
    {
      id: '4484345-125936833',
      job_ad_id: 4484345,
      title: 'Warehouse Operative',
      contract: 'Permanent contract',
      location: 'Bhiwandi',
      job: 'Warehouse Operative',
      url: '4484345-warehouse-operative-bhiwandi',
    },
  ],
}

test('runApiPortalScraper maps Decathlon Sports India public Cegid job listings', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'decathlon')
  assert.ok(provider)

  const jobs = await runApiPortalScraper({
    provider,
    fetchJson: async (url, options = {}) => {
      assert.equal(
        url,
        'https://api.digitalrecruiters.com/public/v1/careers-site/job-ads?domainName=joinus.decathlon.in&limit=100&locale=en_GB&page=1',
      )
      assert.equal(options.method, 'POST')
      assert.equal(options.headers['Content-Type'], 'application/json')
      assert.deepEqual(JSON.parse(options.body), { filters: {} })
      return listingsPayload
    },
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Omni Sport Advisor',
    company: 'Decathlon Sports India',
    location: 'Siliguri',
    city: 'Siliguri',
    country: 'India',
    link: 'https://joinus.decathlon.in/en/annonces/4484711-omni-sport-advisor-siliguri',
    applyUrl: 'https://joinus.decathlon.in/en/annonces/4484711-omni-sport-advisor-siliguri',
    sourceUrl: 'https://joinus.decathlon.in/en/annonces/4484711-omni-sport-advisor-siliguri',
    source: 'decathlon',
    jobId: 4484711,
    requisitionId: '4484711-42252177',
    department: 'Omnichannel Sales Advisor',
    employmentType: 'Permanent contract',
    experienceRequired: null,
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.equal(jobs[1].city, 'Bhiwandi')
})
