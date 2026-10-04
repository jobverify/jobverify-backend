import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { CAREERS_URL, COMPANY, HOMEPAGE_URL, SOURCE, createPersevexScraper, extractPublicJobs, extractPublishedClientUrl, hasOfficialCareersSignal, hasOfficialHomepageSignal, hasVerifiedCareersLink } from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const fixture = name => readFileSync(new URL('./fixtures/' + name, import.meta.url), 'utf8')
const homepageHtml = fixture('current-home.html')
const careersHtml = fixture('current-careers.html')
const client = fixture('persevex-careers-client.js')

test('Persevex scraper recognizes the verified homepage and careers surface', () => {
  assert.equal(SOURCE, 'persevex')
  assert.equal(COMPANY, 'Persevex')
  assert.equal(HOMEPAGE_URL, 'https://www.persevex.com/')
  assert.equal(CAREERS_URL, 'https://www.persevex.com/careers')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasVerifiedCareersLink(homepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
})

test('Persevex extracts real client descriptions and exact stable identities for known India cards', () => {
  const jobs = extractPublicJobs(careersHtml, client)
  assert.equal(jobs.length, 5)
  const frontend = jobs.find(job => job.jobId === 'fe-dev')
  assert.equal(frontend.title, 'Frontend Developer')
  assert.equal(frontend.requisitionId, 'fe-dev')
  assert.equal(frontend.location, 'Remote (India)')
  assert.equal(frontend.applyUrl, CAREERS_URL)
  assert.match(frontend.jobDescription, /^Build and maintain the Persevex web platform using Next\.js/)
  assert.match(frontend.jobDescription, /2\+ years with React \/ Next\.js/)
  assert.deepEqual(frontend.requirements, ['2+ years with React / Next.js', 'Strong TypeScript fundamentals', 'Experience with Tailwind CSS', 'Eye for detail and animation'])
  assert.ok(jobs.every(job => job.country === 'India' && job.sourceListingComplete === false))
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 6)
})

test('Persevex run validates three exact first-party responses and decorates partial jobs', async () => {
  const clientUrl = extractPublishedClientUrl(careersHtml)
  const requested = []
  const pages = new Map([[HOMEPAGE_URL, homepageHtml], [CAREERS_URL, careersHtml], [clientUrl, client]])
  const jobs = await createPersevexScraper().run({ fetchPage: async url => {
    requested.push(url)
    assert.ok(pages.has(url))
    return { status: 200, url, html: pages.get(url) }
  } })
  assert.deepEqual(requested, [HOMEPAGE_URL, CAREERS_URL, clientUrl])
  assert.equal(jobs.length, 5)
  assert.ok(jobs.every(job => job.source === SOURCE && job.companyDomain === 'persevex.com' && job.link === CAREERS_URL && job.publicExperienceChecked === true))
  assert.equal(readInventoryEvidence(jobs).pagesFetched, 3)
})

test('Persevex fails closed on changed identity and card count', async () => {
  await assert.rejects(createPersevexScraper().run({ fetchPage: async url => ({ status: 200, url, html: homepageHtml.replaceAll('Persevex', 'Unrelated Company') }) }), /official homepage/i)
  assert.throws(() => extractPublicJobs(careersHtml.replace('>6</span> role', '>8</span> role'), client), /count|cards/i)
  assert.throws(() => extractPublicJobs(careersHtml.replace('Help students', 'Unrelated vacancies'), client), /verified public careers/i)
})
