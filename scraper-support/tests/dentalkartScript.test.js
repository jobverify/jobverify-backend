import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import * as dentalkart from '../../scraper/dentalkart/script.js'

const fixture = name => readFileSync(new URL('../../scraper/dentalkart/fixtures/' + name, import.meta.url), 'utf8')
const portalHtml = fixture('zoho-portal.html')
const payload = JSON.parse(fixture('zoho-jobs.json'))
const homepageHtml = `<title>Dentalkart - India&#x27;s Largest Online Dental Store</title><meta name="description" content="India&#x27;s largest online dental store. Buy premium dental equipment, instruments, materials &amp; consumables at best prices. Free shipping, COD &amp; EMI available."><span>Search over 20,000 Dental Products</span><footer>VASA DENTICITY LIMITED<a href="https://dentalkart.zohorecruit.in/jobs/Careers">Careers</a></footer>`
const aboutHtml = `<title>About Us · Dentalkart</title><meta name="description" content="Dentalkart was built by dentists, for dentists. India&#x27;s largest dental supplies marketplace - 2 lakh+ clinics, 20,480 SKUs, 500+ direct brand partnerships. Listed on NSE Emerge as DENTALKART."><footer>VASA DENTICITY LIMITED<a href="https://dentalkart.zohorecruit.in/jobs/Careers">Careers</a></footer>`
const careersHtml = `<title>Buy Dental Products </title><script src="/_next/static/chunks/app/careers/page-7d4b0851d4e7566a.js"></script><span>Search over 20,000 Dental Products</span><a href="https://dentalkart.zohorecruit.in/jobs/Careers">Careers</a>`
const pageFor = url => ({ status: 200, url, html: ({ [dentalkart.HOMEPAGE_URL]: homepageHtml, [dentalkart.ABOUT_URL]: aboutHtml, [dentalkart.CAREERS_URL]: careersHtml, [dentalkart.CAREERS_PORTAL_URL]: portalHtml })[url] })
const clonePayload = () => structuredClone(payload)

test('Dentalkart accepts current branded pages only with the official Zoho careers handoff', () => {
  assert.equal(dentalkart.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(dentalkart.hasOfficialAboutPageSignal(aboutHtml), true)
  assert.equal(dentalkart.hasOfficialCareersShellSignal(careersHtml), true)
  assert.equal(dentalkart.hasOfficialHomepageSignal(homepageHtml.replace('dentalkart.zohorecruit.in', 'other.zohorecruit.in')), false)
  assert.equal(dentalkart.hasOfficialHomepageSignal(homepageHtml.replace('India&#x27;s Largest Online Dental Store', 'Another store')), false)
})

test('Dentalkart reads all 34 real portal records and verifies the VASA employer identity', () => {
  const jobs = dentalkart.readPortalInventory(portalHtml)
  assert.equal(jobs.length, 34)
  assert.equal(jobs.filter(j => j.Publish && !j.Is_Locked).length, 24)
  assert.throws(() => dentalkart.readPortalInventory(portalHtml.replaceAll('VASA Denticity Limited', 'Other Employer')), /verified.*Zoho.*identity/i)
})

test('Dentalkart extracts 24 active India jobs and excludes ten retained closed roles', () => {
  const jobs = dentalkart.extractIndiaJobs(payload, { portalJobs: dentalkart.readPortalInventory(portalHtml) })
  assert.equal(jobs.length, 24)
  assert.equal(new Set(jobs.map(j => j.jobId)).size, 24)
  assert.equal(jobs.some(j => j.jobId === '178824000003020918'), false)
  const techLead = jobs.find(j => j.jobId === '178824000004696459')
  assert.equal(techLead.company, 'Dentalkart')
  assert.equal(techLead.sourceUrl, 'https://dentalkart.zohorecruit.in/jobs/Careers/178824000004696459/Tech-Lead?source=CareerSite')
  assert.equal(techLead.applyUrl, techLead.sourceUrl)
  assert.equal(techLead.postingDate, '2026-10-07')
  assert.equal(techLead.country, 'India')
  assert.equal(techLead.employmentType, 'Full-time')
  assert.equal(techLead.experienceRequired, '4-5 years')
  assert.match(techLead.jobDescription, /Full-Stack Development/)
  assert.equal(jobs.every(j => j.jobDescription.length > 800), true)
})

test('Dentalkart run validates the current first-party handoff and complete API inventory', async () => {
  const requests = []
  const jobs = await dentalkart.run({ fetchPage: async url => { requests.push(url); return pageFor(url) }, fetchJson: async url => { requests.push(url); return payload }, now: () => '2026-10-08T00:00:00.000Z' })
  assert.deepEqual(requests, [dentalkart.HOMEPAGE_URL, dentalkart.ABOUT_URL, dentalkart.CAREERS_URL, 'https://dentalkart.zohorecruit.in/jobs/Careers', 'https://dentalkart.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite'])
  assert.equal(jobs.length, 24)
  assert.equal(jobs.every(j => j.source === 'dentalkart' && j.link === j.applyUrl && j.scrapedAt === '2026-10-08T00:00:00.000Z'), true)
})

test('Dentalkart rejects truncated or duplicate API records instead of returning partial jobs', () => {
  const portalJobs = dentalkart.readPortalInventory(portalHtml)
  const truncated = clonePayload(); truncated.data.pop()
  assert.throws(() => dentalkart.extractIndiaJobs(truncated, { portalJobs }), /incomplete|inventory/i)
  const duplicated = clonePayload(); duplicated.data[0] = duplicated.data[1]
  assert.throws(() => dentalkart.extractIndiaJobs(duplicated, { portalJobs }), /duplicate|inventory/i)
})

test('Dentalkart rejects API status drift and active role identity or content drift', () => {
  for (const change of [j => { j.Is_Locked = undefined }, j => { j.$url = 'https://other.zohorecruit.in/jobs/Careers/' + j.id + '/Role' }, j => { j.Job_Description = '' }, j => { j.Country = '' }]) {
    const altered = clonePayload(); change(altered.data.find(j => j.Publish))
    assert.throws(() => dentalkart.extractIndiaJobs(altered), /contract|record|URL|description/i)
  }
  assert.throws(() => dentalkart.extractIndiaJobs({ code: 'error', data: [] }), /success|contract/i)
  assert.throws(() => dentalkart.extractIndiaJobs({ code: 'success', data: [] }), /contract/i)
})

test('Dentalkart rejects mismatching portal publication state and unexpected API pagination', () => {
  const altered = clonePayload(); altered.data[0].Publish = true; altered.data[0].Is_Locked = false
  assert.throws(() => dentalkart.extractIndiaJobs(altered, { portalJobs: dentalkart.readPortalInventory(portalHtml) }), /inventory/i)
  const paginated = clonePayload(); paginated.info.more_records = true
  assert.throws(() => dentalkart.extractIndiaJobs(paginated), /incomplete|pagination/i)
})

test('Dentalkart run preserves upstream HTTP errors and branded-surface failures', async () => {
  const upstreamError = new Error('HTTP 503 for Zoho public API')
  await assert.rejects(dentalkart.run({ fetchPage: async url => pageFor(url), fetchJson: async () => { throw upstreamError } }), error => error === upstreamError)
  for (const changedUrl of [dentalkart.HOMEPAGE_URL, dentalkart.ABOUT_URL, dentalkart.CAREERS_URL, dentalkart.CAREERS_PORTAL_URL]) {
    await assert.rejects(dentalkart.run({ fetchPage: async url => url === changedUrl ? {status: 503, url, html: pageFor(url).html} : pageFor(url), fetchJson: async () => payload }), /verified/i)
  }
})

test('Dentalkart propagates cancellation before requests and during API transport', async () => {
  const reason = new Error('source cancelled')
  let calls = 0
  await assert.rejects(dentalkart.run({ signal: AbortSignal.abort(reason), fetchPage: async () => { calls++; return {} } }), error => error === reason)
  assert.equal(calls, 0)
  const controller = new AbortController()
  await assert.rejects(dentalkart.run({ signal: controller.signal, fetchPage: async (url, options) => { assert.equal(options.signal, controller.signal); return pageFor(url) }, fetchJson: async (_url, options) => { assert.equal(options.signal, controller.signal); controller.abort(reason); return payload } }), error => error === reason)
})
