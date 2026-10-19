import assert from 'node:assert/strict'
import test from 'node:test'
import { createDineoutScraper, run } from '../../scraper/dineout/script.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'
import { getRetryMetadata, withRetry } from '../utils/retry.js'

const careersHtml = '<title>Swiggy Careers - Build, Scale, Deliver India\'s Everyday Needs</title><meta name="description" content="Swiggy Careers - Join India"><script type="module" src="/assets/index-live.js"></script><div id="root"></div>'
const appScript = 'const jobsUrl="/api/jobs.json"; const brand={name:"Dineout"}; const heading="Explore Open Roles"; const filter="Filter by business unit";'
const posting = (id, name, unit, country = 'in', city = 'Mumbai') => ({
  id, name, company: { identifier: 'SWIGGY', name: 'SWIGGY' }, visibility: 'PUBLIC',
  ref: 'https://api.smartrecruiters.com/v1/companies/SWIGGY/postings/' + id,
  location: { city, region: 'MH', country, fullLocation: city + ', ' + (country === 'in' ? 'India' : 'United Kingdom') },
  customField: [{ fieldLabel: 'BusinessUnit', valueLabel: unit }, { fieldLabel: 'Department.', valueLabel: 'Supply' }],
  releasedDate: '2026-10-06T05:22:17.931Z', refNumber: 'REF' + id, typeOfEmployment: { label: 'Full-time' },
})
const allPostings = [posting('101', 'Account Manager', 'Dine Out'), posting('102', 'Engineer', 'Technology'), posting('103', 'Account Manager', 'Dine Out', 'gb', 'London'), posting('104', 'Sales Manager', 'Dine Out', 'in', 'Delhi')]
const feedFor = items => ({ total: items.length, generatedAt: '2026-10-08T18:03:22.795Z', jobs: items.map(item => ({ t: item.name.trim(), c: item.location.city, l: item.location.fullLocation, b: item.customField.find(field => field.fieldLabel === 'BusinessUnit')?.valueLabel, u: 'https://jobs.smartrecruiters.com/SWIGGY/' + item.id + '2-role' })) })
const detailFor = item => ({ ...item, active: true,
  postingUrl: 'https://jobs.smartrecruiters.com/SWIGGY/' + item.id + '-role', applyUrl: 'https://jobs.smartrecruiters.com/SWIGGY/' + item.id + '-role?oga=true',
  jobAd: { sections: { companyDescription: { text: '<p>Swiggy Dineout is building a dining out platform.</p>' }, jobDescription: { text: '<p>Onboard restaurant partners.</p>' }, qualifications: { text: '<p>Graduate with field sales experience.</p>' } } },
})
const buildFetch = ({ items = allPostings, feed = feedFor(items), mutateList = page => page, mutateDetail = detail => detail } = {}, requests = []) => async url => {
  requests.push(url)
  if (url === 'https://www.swiggy.com/corporate/our-business/') return { status: 200, url, html: '<title>Our Business - Swiggy</title><p>Dineout facilitates a user’s eating-out experience.</p><footer>Swiggy Limited</footer>' }
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
  throw new Error('Unexpected Dineout URL: ' + url)
}
const now = () => '2026-10-08T18:00:00.000Z'

test('Dineout verifies the migrated Swiggy handoff and complete inventories, extracting only attributed India roles', async () => {
  const requests = []
  const jobs = await createDineoutScraper({ now }).run({ fetchPage: buildFetch({}, requests) })
  assert.deepEqual(jobs.map(job => job.jobId), ['101', '104'])
  assert.equal(jobs[0].company, 'Dineout')
  assert.equal(jobs[0].location, 'Mumbai, India')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].department, 'Supply')
  assert.equal(jobs[0].postingDate, '2026-10-06T05:22:17.931Z')
  assert.equal(jobs[0].sourceUrl, 'https://jobs.smartrecruiters.com/SWIGGY/101-role')
  assert.equal(jobs[0].applyUrl, 'https://jobs.smartrecruiters.com/SWIGGY/101-role?oga=true')
  assert.match(jobs[0].jobDescription, /Onboard restaurant partners/)
  assert.equal(jobs[0].minimumQualification, 'Graduate with field sales experience.')
  assert.equal(requests.some(url => /dineout\.co\.in|mynexthire/.test(url)), false)
  assert.equal(requests.filter(url => /\/postings\?/.test(url)).length, 2)
  assert.equal(requests.includes(allPostings[1].ref), false)
  assert.equal(requests.includes(allPostings[2].ref), false)
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.status, 'complete-inventory')
  assert.equal(evidence.listingComplete, true)
  assert.equal(evidence.reportedTotal, 2)
  assert.equal(evidence.pagesFetched, 2)
  assert.equal(evidence.indiaFacetCount, 2)
})

for (const { name, items, feed } of [
  { name: 'an unrelated title changes', items: allPostings, feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index) => index === 1 ? { ...job, t: 'Senior Engineer' } : job) } },
  { name: 'an unrelated business unit changes', items: allPostings, feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index) => index === 1 ? { ...job, b: 'Instamart' } : job) } },
  { name: 'the ATS has an additional unrelated role', items: [...allPostings, posting('105', 'Warehouse Lead', 'Instamart')], feed: feedFor(allPostings) },
  { name: 'the parent has an additional unrelated role', items: allPostings, feed: feedFor([...allPostings, posting('105', 'Warehouse Lead', 'Instamart')]) },
]) {
  test('Dineout preserves the complete attributed cohort when ' + name, async () => {
    const jobs = await run({ fetchPage: buildFetch({ items, feed }) })
    assert.deepEqual(jobs.map(job => [job.jobId, job.company, job.country]), [['101', 'Dineout', 'India'], ['104', 'Dineout', 'India']])
    assert.equal(readInventoryEvidence(jobs).status, 'complete-inventory')
    assert.equal(readInventoryEvidence(jobs).reportedTotal, 2)
  })
}

for (const { name, items = allPostings, feed } of [
  { name: 'a target title changes', feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index) => index === 0 ? { ...job, t: 'Senior Account Manager' } : job) } },
  { name: 'a target city changes', feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index) => index === 0 ? { ...job, c: 'Pune' } : job) } },
  { name: 'a target role is absent from the parent feed', feed: feedFor(allPostings.slice(1)) },
  { name: 'a target role is absent from the ATS', items: allPostings.slice(1), feed: feedFor(allPostings) },
  { name: 'target attribution changes', feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index) => index === 0 ? { ...job, b: 'Technology' } : job) } },
  { name: 'a foreign Dine Out role changes', feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index) => index === 2 ? { ...job, t: 'Senior Account Manager' } : job) } },
  { name: 'target signature multiplicity differs', feed: feedFor([...allPostings, posting('105', 'Account Manager', 'Dine Out')]) },
  { name: 'only the parent still has Dine Out roles', items: [allPostings[1]], feed: feedFor(allPostings) },
]) {
  test('Dineout reports unavailable without returning partial or empty inventory when ' + name, async () => {
    const requests = []
    await assert.rejects(withRetry(() => run({ fetchPage: buildFetch({ items, feed }, requests) }), { label: 'dineout', attempts: 4, baseDelayMs: 0 }), error => {
      assert.match(error.message, /Dineout parent and ATS inventories disagree.*Dine Out/)
      assert.equal(error.softFailure, true)
      assert.equal(error.failureKind, 'upstream_inventory_unavailable')
      assert.equal(error.abortRetries, true)
      assert.equal(error.code, 'DINEOUT_INVENTORY_UNAVAILABLE')
      assert.equal(getRetryMetadata(error).attemptsUsed, 1)
      return true
    })
    assert.equal(requests.filter(url => url === 'https://careers.swiggy.com/').length, 1)
    assert.equal(requests.some(url => /\/postings\/\d+$/.test(url)), false)
  })
}

for (const { name, options, error } of [
  { name: 'a truncated parent feed', options: { feed: { ...feedFor(allPostings), total: 5 } }, error: /incomplete Swiggy careers inventory/ },
  { name: 'repeated parent feed links', options: { feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index, jobs) => index === 1 ? { ...job, u: jobs[0].u } : job) } }, error: /incomplete Swiggy careers inventory/ },
  { name: 'a truncated ATS inventory', options: { mutateList: page => ({ ...page, content: [] }) }, error: /incomplete SmartRecruiters inventory/ },
  { name: 'changing ATS totals between pages', options: { mutateList: page => ({ ...page, totalFound: page.offset ? page.totalFound + 1 : page.totalFound }) }, error: /incomplete SmartRecruiters inventory/ },
  { name: 'duplicate ATS IDs', options: { mutateList: page => ({ ...page, content: [allPostings[0], allPostings[0]] }) }, error: /incomplete SmartRecruiters inventory/ },
  { name: 'unresolved business unit attribution', options: { mutateList: page => ({ ...page, content: page.content.map(item => ({ ...item, customField: [] })) }) }, error: /business unit attribution/ },
  { name: 'parent and ATS attribution disagreement', options: { feed: { ...feedFor(allPostings), jobs: feedFor(allPostings).jobs.map((job, index) => index === 0 ? { ...job, b: 'Technology' } : job) } }, error: /parent and ATS inventories disagree/ },
  { name: 'unresolved country', options: { mutateList: page => ({ ...page, content: page.content.map(item => ({ ...item, location: { ...item.location, country: null } })) }) }, error: /location country/ },
  { name: 'foreign tenant detail links', options: { mutateList: page => ({ ...page, content: page.content.map(item => ({ ...item, ref: item.ref.replace('SWIGGY', 'OTHER') })) }) }, error: /verified Swiggy tenant/ },
  { name: 'detail attribution disagreement', options: { mutateDetail: detail => ({ ...detail, customField: [{ fieldLabel: 'BusinessUnit', valueLabel: 'Technology' }] }) }, error: /Dine Out job detail/ },
  { name: 'inactive selected details', options: { mutateDetail: detail => ({ ...detail, active: false }) }, error: /Dine Out job detail/ },
  { name: 'missing selected description', options: { mutateDetail: detail => ({ ...detail, jobAd: { sections: {} } }) }, error: /Dine Out job description/ },
]) {
  test('Dineout rejects ' + name + ' without masking incomplete inventory', async () => {
    await assert.rejects(run({ fetchPage: buildFetch(options) }), error)
  })
}

test('Dineout rejects an unverified careers redirect', async () => {
  await assert.rejects(run({ fetchPage: async () => ({ status: 200, url: 'https://careers.example.com/', html: careersHtml }) }), /verified Swiggy careers handoff/)
})

test('Dineout returns verified empty only after complete parent inventories have no attributed India roles', async () => {
  const items = [allPostings[1], allPostings[2]]
  const jobs = await run({ fetchPage: buildFetch({ items }) })
  assert.deepEqual(jobs, [])
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.status, 'verified-empty')
  assert.equal(evidence.listingComplete, true)
  assert.equal(evidence.reportedTotal, 0)
  assert.equal(evidence.indiaFacetCount, 0)
})
