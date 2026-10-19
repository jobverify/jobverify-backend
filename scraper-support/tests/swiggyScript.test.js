import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const loadSwiggy = async () => {
  try { return await import('../../scraper/swiggy/script.js') }
  catch { assert.fail('Expected the migrated Swiggy scraper module') }
}
const careersHtml = '<title>Swiggy Careers - Build, Scale, Deliver</title><meta name="description" content="Swiggy Careers - Join India"><script type="module" src="/assets/index-live.js"></script>'
const appScript = 'const jobsUrl="/api/jobs.json"; const heading="Explore Open Roles"; const filter="Filter by business unit";'
const posting = (id, name, unit, country = 'in', city = 'Bengaluru') => ({
  id, name, company: { identifier: 'SWIGGY', name: 'SWIGGY' }, visibility: 'PUBLIC',
  ref: 'https://api.smartrecruiters.com/v1/companies/SWIGGY/postings/' + id,
  location: { city, region: 'KA', country, fullLocation: city + ', ' + (country === 'in' ? 'India' : 'United Kingdom') },
  customField: [{ fieldLabel: 'BusinessUnit', valueLabel: unit }, { fieldLabel: 'Department.', valueLabel: 'Engineering' }],
  releasedDate: '2026-10-19T05:22:17.931Z', refNumber: 'REF' + id, typeOfEmployment: { label: 'Full-time' },
})
const allPostings = [posting('101', 'Software Engineer', 'Technology'), posting('102', 'Account Manager', 'Dine Out'), posting('103', 'Engineer', 'Technology', 'gb', 'London'), posting('104', 'Area Manager', 'Instamart')]
const feedFor = items => ({ total: items.length, jobs: items.map(item => ({ t: item.name, c: item.location.city, b: item.customField.find(field => field.fieldLabel === 'BusinessUnit').valueLabel, u: 'https://jobs.smartrecruiters.com/SWIGGY/' + item.id + '2-role' })) })
const detailFor = item => ({ ...item, active: true,
  postingUrl: 'https://jobs.smartrecruiters.com/SWIGGY/' + item.id + '-role', applyUrl: 'https://jobs.smartrecruiters.com/SWIGGY/' + item.id + '-role?oga=true',
  jobAd: { sections: { jobDescription: { text: '<p>Build services used across India.</p>' }, qualifications: { text: '<p>Graduate with engineering experience.</p>' } } },
})
const buildFetch = ({ items = allPostings, feed = feedFor(items), mutateList = page => page, mutateDetail = detail => detail } = {}, requests = []) => async url => {
  requests.push(url)
  if (url === 'https://careers.swiggy.com/') return { status: 200, url: 'https://careers.swiggy.in/', html: careersHtml }
  if (url === 'https://careers.swiggy.in/assets/index-live.js') return { status: 200, url, html: appScript }
  if (url === 'https://careers.swiggy.in/api/jobs.json') return { status: 200, url, html: JSON.stringify(feed) }
  const parsed = new URL(url)
  if (parsed.pathname === '/v1/companies/SWIGGY/postings') {
    const offset = Number(parsed.searchParams.get('offset'))
    return { status: 200, url, html: JSON.stringify(mutateList({ offset, limit: 100, totalFound: items.length, content: items.slice(offset, offset + 2) })) }
  }
  const item = items.find(item => item.ref === url)
  if (item) return { status: 200, url, html: JSON.stringify(mutateDetail(detailFor(item))) }
  throw new Error('Unexpected Swiggy URL: ' + url)
}

test('the Swiggy runner uses the migrated script instead of the retired MyNextHire API', () => {
  const provider = getScraperCatalog().find(item => item.source === 'swiggy')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'smartrecruiters')
  assert.equal(provider.companyCareerPage, 'https://careers.swiggy.in/')
  const scraper = buildScrapers().find(item => item.name === 'swiggy')
  assert.equal(scraper.provider.parser, 'custom-script')
  assert.match(scraper.provider.modulePath, /swiggy[\\/]script\.js$/)
})

test('Swiggy reconciles both complete inventories and emits explicitly Indian parent roles across business units', async () => {
  const { createSwiggyScraper } = await loadSwiggy()
  const requests = []
  const jobs = await createSwiggyScraper({ now: () => '2026-10-19T18:00:00.000Z' }).run({ fetchPage: buildFetch({}, requests) })
  assert.deepEqual(jobs.map(job => job.jobId), ['101', '102', '104'])
  assert.equal(jobs.every(job => job.company === 'Swiggy' && job.source === 'swiggy' && job.country === 'India'), true)
  assert.equal(jobs[0].department, 'Engineering')
  assert.equal(jobs[0].location, 'Bengaluru, India')
  assert.equal(jobs[0].sourceUrl, 'https://jobs.smartrecruiters.com/SWIGGY/101-role')
  assert.equal(jobs[0].applyUrl, 'https://jobs.smartrecruiters.com/SWIGGY/101-role?oga=true')
  assert.equal(jobs[0].jobDescription, 'Build services used across India.\nGraduate with engineering experience.')
  assert.equal(jobs[0].scrapedAt, '2026-10-19T18:00:00.000Z')
  assert.equal(requests.some(url => /mynexthire/.test(url)), false)
  assert.equal(requests.includes(allPostings[2].ref), false)
  assert.equal(requests.filter(url => /\/postings\?/.test(url)).length, 2)
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.listingComplete, true)
  assert.equal(evidence.status, 'complete-inventory')
  assert.equal(evidence.indiaFacetCount, 3)
  assert.equal(evidence.pagesFetched, 2)
})

for (const { name, options, error } of [
  { name: 'truncated first-party feed', options: { feed: { ...feedFor(allPostings), total: 5 } }, error: /incomplete Swiggy careers inventory/ },
  { name: 'truncated ATS pages', options: { mutateList: page => ({ ...page, content: [] }) }, error: /incomplete SmartRecruiters inventory/ },
  { name: 'duplicate ATS identities', options: { mutateList: page => ({ ...page, content: [allPostings[0], allPostings[0]] }) }, error: /incomplete SmartRecruiters inventory/ },
  { name: 'missing business units', options: { mutateList: page => ({ ...page, content: page.content.map(item => ({ ...item, customField: [] })) }) }, error: /business unit attribution/ },
  { name: 'conflicting first-party attribution', options: { feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index) => index === 0 ? { ...job, b: 'Instamart' } : job) } }, error: /parent and ATS inventories disagree/ },
  { name: 'missing country', options: { mutateList: page => ({ ...page, content: page.content.map(item => ({ ...item, location: { ...item.location, country: null } })) }) }, error: /location country/ },
  { name: 'foreign tenant detail links', options: { mutateList: page => ({ ...page, content: page.content.map(item => ({ ...item, ref: item.ref.replace('SWIGGY', 'OTHER') })) }) }, error: /verified Swiggy tenant/ },
  { name: 'detail business unit conflict', options: { mutateDetail: detail => ({ ...detail, customField: [{ fieldLabel: 'BusinessUnit', valueLabel: 'Other' }] }) }, error: /job detail/ },
  { name: 'detail country conflict', options: { mutateDetail: detail => ({ ...detail, location: { ...detail.location, country: 'gb' } }) }, error: /job detail/ },
  { name: 'inactive details', options: { mutateDetail: detail => ({ ...detail, active: false }) }, error: /job detail/ },
  { name: 'foreign application links', options: { mutateDetail: detail => ({ ...detail, applyUrl: 'https://jobs.smartrecruiters.com/OTHER/101-role' }) }, error: /job detail/ },
  { name: 'missing descriptions', options: { mutateDetail: detail => ({ ...detail, jobAd: { sections: {} } }) }, error: /job description/ },
]) {
  test('Swiggy fails closed for ' + name, async () => {
    const { run } = await loadSwiggy()
    await assert.rejects(run({ fetchPage: buildFetch(options) }), error)
  })
}

test('Swiggy rejects an unverified redirect and propagates HTTP failures', async () => {
  const { run } = await loadSwiggy()
  await assert.rejects(run({ fetchPage: async () => ({ status: 200, url: 'https://careers.example.com/', html: careersHtml }) }), /verified Swiggy careers handoff/)
  const fetchPage = buildFetch()
  await assert.rejects(run({ fetchPage: async url => url.includes('/api/jobs.json') ? { status: 503, url, html: '{}' } : fetchPage(url) }), /public inventory request failed/)
})

test('Swiggy returns verified empty only after both full inventories contain no explicitly Indian roles', async () => {
  const { run } = await loadSwiggy()
  const jobs = await run({ fetchPage: buildFetch({ items: [allPostings[2]] }) })
  assert.deepEqual(jobs, [])
  assert.equal(readInventoryEvidence(jobs).status, 'verified-empty')
  assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 0)
})

test('Swiggy honors cancellation even when an injected fetch ignores the signal', async () => {
  const { run } = await loadSwiggy()
  const reason = new Error('source cancelled')
  await assert.rejects(run({ signal: AbortSignal.abort(reason), fetchPage: buildFetch() }), error => error === reason)
  const controller = new AbortController()
  const fetchPage = buildFetch()
  await assert.rejects(run({ signal: controller.signal, fetchPage: async url => { const result = await fetchPage(url); controller.abort(reason); return result } }), error => error === reason)
})

test('Swiggy preserves active public vacancies with an explicitly blank role description without substituting company boilerplate', async () => {
  const { run } = await loadSwiggy()
  const detail = JSON.parse(await readFile(new URL('../../scraper/swiggy/fixtures/active-blank-description.json', import.meta.url), 'utf8'))
  const listing = { ...detail, ref: 'https://api.smartrecruiters.com/v1/companies/SWIGGY/postings/6000000001497239' }
  const jobs = await run({ fetchPage: buildFetch({ items: [listing], mutateDetail: () => detail }) })
  assert.deepEqual(jobs.map(job => job.jobId), ['6000000001497239'])
  assert.equal(jobs.every(job => job.jobDescription === null && job.experienceRequired === null), true)
  assert.equal(jobs[0].location, 'Delhi, DL, India')
  assert.equal(jobs[0].minimumQualification, null)
  assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 1)
})
