import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  API_URL,
  CAREERS_URL,
  createDecathlonIndiaScraper,
  extractDecathlonOfferLinks,
} from '../../scraper/decathlonindia.workday/script.js'
import { getScraperCatalog } from '../providers/index.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const readFixture = (name) => readFile(
  new URL(`./fixtures/decathlonindia/${name}`, import.meta.url),
  'utf8',
)

test('Decathlon India extracts the complete official DigitalRecruiters inventory', async () => {
  const shell = await readFixture('job-offers.html')
  const page = JSON.parse(await readFixture('job-offers.json'))
  const requestedPages = []
  const jobs = await createDecathlonIndiaScraper({
    fetchHtml: async (url) => {
      assert.equal(url, CAREERS_URL)
      return shell
    },
    fetchJson: async (url, options) => {
      assert.equal(url, API_URL)
      assert.deepEqual(options.body, {})
      requestedPages.push(options.page)
      return page
    },
    now: () => '2026-09-13T00:00:00.000Z',
  }).run({ pageSize: 100 })

  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(jobs.map(({ title }) => title), [
    'RFID Engineer / RFID Project Lead (L2/L3)',
    'Production Supply Specialist',
  ])
  assert.deepEqual(extractDecathlonOfferLinks(page), [
    'https://joinus.decathlon.in/en/annonce/4592987-rfid-engineer-rfid-project-lead-l2l3-bengaluru',
    'https://joinus.decathlon.in/en/annonce/4554519-production-supply-specialist-faridabad',
  ])
  assert.ok(jobs.every(({ company, country, applyUrl, sourceListingComplete }) => (
    company === 'Decathlon India'
    && country === 'India'
    && applyUrl.startsWith('https://joinus.decathlon.in/en/annonce/')
    && sourceListingComplete === true
  )))
  assert.deepEqual(readInventoryEvidence(jobs), {
    status: 'complete-inventory',
    surface: API_URL,
    firstParty: true,
    listingComplete: true,
    pagesFetched: 1,
    reportedTotal: 2,
    indiaFacetCount: 2,
    verifiedAt: '2026-09-13T00:00:00.000Z',
    reason: 'complete-decathlon-india-digitalrecruiters-inventory',
  })
})

test('Decathlon India rejects a changed official offers shell', async () => {
  await assert.rejects(
    createDecathlonIndiaScraper({ fetchHtml: async () => '<html></html>' }).run(),
    /changed materially/i,
  )
})

test('Decathlon India refuses incomplete or unsafe API results', async () => {
  const shell = await readFixture('job-offers.html')
  const unsafePage = {
    count: 2,
    items: [{
      id: '1',
      job_ad_id: 1,
      title: 'Engineer',
      location: 'Bengaluru',
      url: 'https://evil.example/job/1',
      career_domain: 'evil.example',
    }],
  }

  await assert.rejects(
    createDecathlonIndiaScraper({
      fetchHtml: async () => shell,
      fetchJson: async () => unsafePage,
    }).run(),
    /unsafe|incomplete|changed materially/i,
  )
})

test('active catalog routes Decathlon India through the live official parser', () => {
  const provider = getScraperCatalog().find(({ source }) => source === 'decathlonindia')

  assert.equal(provider.atsPlatform, 'digitalrecruiters')
  assert.equal(provider.companyCareerPage, CAREERS_URL)
  assert.equal(provider.zeroResultPolicy, 'evidence-required')
})
