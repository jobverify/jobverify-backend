import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createAlliedDigitalServicesScraper } from '../../scraper/allieddigitalservices/script.js'

const BASE = 'https://www.allieddigital.net'
const API = BASE + '/wp-json/wp/v2/awsm_job_openings'
const readFixture = (name) => readFile(new URL('./fixtures/allieddigitalservices/' + name, import.meta.url), 'utf8')
const [rootHtml, careersHtml, listingHtml, apiFixture, serviceHtml, endpointHtml, networkHtml] = await Promise.all([
  'homepage.html', 'careers.html', 'job-openings.html', 'jobs-api-page-1.json',
  'service-desk-executive-l3.html', 'endpoint-administrator.html', 'network-engineer-l3.html',
].map(readFixture))
const firstPage = JSON.parse(apiFixture)
const details = new Map([
  [BASE + '/jobs/service-desk-executive-l3/', serviceHtml],
  [BASE + '/jobs/endpoint-administrator/', endpointHtml],
  [BASE + '/jobs/network-engineer-l3/', networkHtml],
])
const runFixture = (overrides = {}) => createAlliedDigitalServicesScraper().run({
  fetchText: async (url) => {
    if (url === BASE + '/') return overrides.root ?? rootHtml
    if (url === BASE + '/careers/') return overrides.careers ?? careersHtml
    if (url === BASE + '/job-openings/') return overrides.listing ?? listingHtml
    const detail = overrides.details?.get(url) ?? details.get(url)
    if (detail != null) return detail
    throw new Error('Unexpected URL: ' + url)
  },
  fetchJobsPage: overrides.fetchJobsPage ?? (async () => overrides.page ?? structuredClone(firstPage)),
  now: () => '2026-10-08T18:00:00.000Z',
})

test('Allied Digital migration reads the complete current WordPress inventory and verified India details', async () => {
  const jobs = await runFixture()
  assert.deepEqual(jobs.map((job) => [job.jobId, job.title, job.location, job.country]), [
    ['4718', 'SERVICE DESK EXECUTIVE L3', 'Navi Mumbai, India', 'India'],
    ['4717', 'Endpoint Administrator', 'Navi Mumbai, India', 'India'],
    ['4596', 'NETWORK ENGINEER L3', 'Navi Mumbai, India', 'India'],
  ])
  assert.equal(jobs[0].department, 'CSD')
  assert.equal(jobs[0].employmentType, 'Full Time')
  assert.equal(jobs[0].postingDate, '2026-05-05T12:52:37+00:00')
  assert.equal(jobs[0].jobDescription, null)
  assert.equal(jobs[1].jobDescription, null)
  assert.match(jobs[2].jobDescription, /L3 escalation support/)
  assert.equal(jobs[2].link, BASE + '/jobs/network-engineer-l3/')
  assert.equal(jobs[2].source, 'allieddigitalservices')
  assert.equal(jobs[2].scrapedAt, '2026-10-08T18:00:00.000Z')
})

test('Allied Digital migration rejects changed first-party root, careers, and opening surfaces', async () => {
  for (const [key, html, message] of [
    ['root', rootHtml, /verified root surface/],
    ['careers', careersHtml, /verified careers surface/],
    ['listing', listingHtml, /verified Hiring Now surface/],
  ]) {
    await assert.rejects(runFixture({ [key]: html.replace(/rel="canonical"/, 'rel="alternate"') }), message)
  }
})

test('Allied Digital inventory rejects missing records, duplicates, and inconsistent page counts', async () => {
  await assert.rejects(runFixture({ page: { ...firstPage, total: 4 } }), /incomplete.*inventory|inventory.*incomplete/i)
  await assert.rejects(runFixture({ page: { ...firstPage, records: [firstPage.records[0], firstPage.records[0], firstPage.records[2]] } }), /duplicate/i)
  await assert.rejects(runFixture({ page: { ...firstPage, totalPages: 2 } }), /page count|pagination/i)
  await assert.rejects(runFixture({ page: { ...firstPage, total: null } }), /inventory|count/i)
  await assert.rejects(runFixture({ page: { records: [], total: 0, totalPages: 0 } }), /inventory|openings/i)
})

test('Allied Digital inventory rejects API jobs omitted from the live opening cards', async () => {
  await assert.rejects(runFixture({ page: { ...firstPage, records: firstPage.records.map((item) => ({ ...item, id: item.id + 1 })) } }), /inventory|listing/i)
})

test('Allied Digital details require the same job identity, canonical URL, employer, and application form', async () => {
  for (const broken of [
    endpointHtml.replace('value="4717"', 'value="9999"'),
    endpointHtml.replace('"name":"Allied Digital"', '"name":"Unrelated Company"'),
    endpointHtml.replace('https:\\/\\/www.allieddigital.net', 'https:\\/\\/unrelated.example'),
    endpointHtml.replace('rel="canonical"', 'rel="alternate"'),
    endpointHtml.replace('class="awsm-job-form"', 'class="other-form"'),
  ]) {
    await assert.rejects(runFixture({ details: new Map([[BASE + '/jobs/endpoint-administrator/', broken]]) }), /verified.*detail|detail.*changed/i)
  }
})

const changeSchema = (html, change) => html.replace(
  /(<script[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/,
  (_, start, json, end) => start + JSON.stringify(change(JSON.parse(json))) + end,
)

test('Allied Digital global inventory filters foreign jobs before assigning India country', async () => {
  const foreign = changeSchema(endpointHtml, (schema) => ({
    ...schema,
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'New York', addressCountry: 'US' } },
  })).replace(/Navi Mumbai/g, 'New York')
  const jobs = await runFixture({ details: new Map([[BASE + '/jobs/endpoint-administrator/', foreign]]) })
  assert.deepEqual(jobs.map((job) => job.jobId), ['4718', '4596'])
})

test('Allied Digital global inventory does not infer India from an unspecified remote location', async () => {
  const remote = changeSchema(endpointHtml, (schema) => ({ ...schema, jobLocation: { '@type': 'Place', address: 'Remote' } }))
    .replace(/Navi Mumbai/g, 'Remote')
  const jobs = await runFixture({ details: new Map([[BASE + '/jobs/endpoint-administrator/', remote]]) })
  assert.deepEqual(jobs.map((job) => job.jobId), ['4718', '4596'])
})

const paginatedInventory = () => {
  const records = [...structuredClone(firstPage.records)]
  const detailMap = new Map(details)
  for (let index = 0; index < 98; index += 1) {
    const id = 5000 + index
    const title = 'Support Engineer ' + index
    const link = BASE + '/jobs/support-engineer-' + index + '/'
    records.push({ ...structuredClone(firstPage.records[0]), id, title: { rendered: title }, link })
    detailMap.set(link, changeSchema(serviceHtml, (schema) => ({ ...schema, title }))
      .replaceAll('SERVICE DESK EXECUTIVE L3', title)
      .replaceAll(BASE + '/jobs/service-desk-executive-l3/', link)
      .replace('value="4718"', 'value="' + id + '"'))
  }
  const cards = records.slice(0, 10).map((item) => '<div class="awsm-job-listing-item awsm-grid-item" id="awsm-grid-item-' + item.id + '"><a href="' + item.link + '" class="awsm-job-item"></a></div>').join('')
  return { records, detailMap, listing: listingHtml.replace(/<div class="awsm-job-listings[\s\S]*$/, '<div class="awsm-job-listings" data-listings="10">' + cards + '</div>') }
}

test('Allied Digital pagination traverses all counted pages without returning a partial inventory', async () => {
  const fixture = paginatedInventory()
  const requested = []
  const jobs = await runFixture({
    listing: fixture.listing, details: fixture.detailMap,
    fetchJobsPage: async (url) => {
      requested.push(url)
      const page = Number(new URL(url).searchParams.get('page'))
      return { records: fixture.records.slice((page - 1) * 100, page * 100), total: 101, totalPages: 2 }
    },
  })
  assert.deepEqual(requested, [API + '?per_page=100&page=1', API + '?per_page=100&page=2'])
  assert.equal(jobs.length, 101)
  assert.equal(new Set(jobs.map((job) => job.jobId)).size, 101)
  assert.equal(jobs.at(-1).jobId, '5097')
})

test('Allied Digital pagination rejects a second page failure or changed inventory count', async () => {
  const fixture = paginatedInventory()
  for (const failure of [new Error('Second page unavailable'), { records: fixture.records.slice(100), total: 102, totalPages: 2 }]) {
    await assert.rejects(runFixture({
      listing: fixture.listing, details: fixture.detailMap,
      fetchJobsPage: async (url) => {
        if (new URL(url).searchParams.get('page') === '1') return { records: fixture.records.slice(0, 100), total: 101, totalPages: 2 }
        if (failure instanceof Error) throw failure
        return failure
      },
    }), /Second page unavailable|inventory.*changed/i)
  }
})

test('Allied Digital API fetch keeps authoritative counts and rejects absent count headers', async () => {
  const { createWordPressJobsPageFetch } = await import('../../scraper/allieddigitalservices/script.js')
  const response = (headers) => new Response(JSON.stringify(firstPage.records), { headers: { 'content-type': 'application/json', ...headers } })
  const fetchPage = createWordPressJobsPageFetch({ fetchImpl: async () => response({ 'x-wp-total': '3', 'x-wp-totalpages': '1' }) })
  assert.deepEqual(await fetchPage(API + '?per_page=100&page=1'), firstPage)
  const uncounted = createWordPressJobsPageFetch({ fetchImpl: async () => response({}) })
  await assert.rejects(uncounted(API + '?per_page=100&page=1'), /count|inventory/i)
})

test('Allied Digital preserves complete inventory evidence when every published role is outside India', async () => {
  const { readInventoryEvidence } = await import('../utils/inventoryEvidence.js')
  const foreignDetails = new Map([...details].map(([url, html]) => [url, changeSchema(html, (schema) => ({
    ...schema,
    jobLocation: { '@type': 'Place', address: { addressLocality: 'New York', addressCountry: 'US' } },
  })).replace(/Navi Mumbai/g, 'New York')]))
  const jobs = await runFixture({ details: foreignDetails })
  assert.deepEqual(jobs, [])
  assert.deepEqual(readInventoryEvidence(jobs), {
    status: 'complete-inventory', surface: API, firstParty: true, listingComplete: true,
    pagesFetched: 1, reportedTotal: 3, indiaFacetCount: 0,
    verifiedAt: '2026-10-08T18:00:00.000Z', reason: 'count-checked-wordpress-inventory-and-verified-details',
  })
})
