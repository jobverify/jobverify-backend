import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DINEOUT_CATALOG } from './catalog.js'
import { composeAbortSignals } from '../../scraper-support/utils/fetch.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { mapWithConcurrency } from '../../scraper-support/utils/mapWithConcurrency.js'
import { toPlainText } from '../../scraper-support/detailExtractors/shared.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const PROVIDER_METADATA = DINEOUT_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const LEGACY_CAREERS_URL = PROVIDER_METADATA.legacyCareersUrl
export const JOBS_FEED_URL = PROVIDER_METADATA.jobsFeedUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
const normalizeString = value => String(value ?? '').replace(/\s+/g, ' ').trim()
const isDineOut = value => /^dine[ -]?out$/i.test(normalizeString(value))
const businessUnit = item => {
  const fields = item?.customField?.filter(field => field.fieldLabel === 'BusinessUnit') || []
  if (fields.length !== 1 || !normalizeString(fields[0].valueLabel)) throw new Error('Dineout unresolved Swiggy business unit attribution')
  return normalizeString(fields[0].valueLabel)
}
const signature = (title, city, unit) => JSON.stringify([title, city, unit].map(value => normalizeString(value).toLowerCase()))
const hasTrustedJobUrl = value => {
  try {
    const url = new URL(value)
    return url.origin === 'https://jobs.smartrecruiters.com' && /^\/SWIGGY\/\d+-[^/]+$/.test(url.pathname)
  } catch { return false }
}
const defaultFetchPage = async (url, { signal } = {}) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'JobverifyCareerScraper/1.0', Accept: 'application/json,text/html,*/*' },
    signal: composeAbortSignals(signal, AbortSignal.timeout(15000)),
    redirect: 'follow',
  })
  return { status: response.status, url: response.url, html: await response.text() }
}
const getJson = async (fetchPage, url) => {
  const page = await fetchPage(url)
  if (page.status !== 200 || page.url !== url) throw new Error('Dineout public inventory request failed for ' + url)
  try { return JSON.parse(page.html) } catch { throw new Error('Dineout malformed public inventory response for ' + url) }
}
const getAppScriptUrl = html => {
  const match = String(html ?? '').match(/<script\b(?=[^>]*\btype=["']module["'])[^>]*\bsrc=["']([^"']+)["']/i)
  if (!match) return null
  const url = new URL(match[1], CAREERS_URL)
  return url.origin === new URL(CAREERS_URL).origin && /^\/assets\/[^/]+\.js$/.test(url.pathname) ? url.toString() : null
}
export const hasParentCareersLandingSignal = html => /<title>\s*Swiggy Careers\b[^<]*<\/title>/i.test(html)
  && /<meta\b(?=[^>]*\bname=["']description["'])[^>]*\bcontent=["'][^"']*Swiggy Careers/i.test(html)
  && Boolean(getAppScriptUrl(html))

const validatePosting = item => {
  if (!/^\d+$/.test(String(item?.id)) || !normalizeString(item?.name) || item.company?.identifier !== 'SWIGGY' || item.visibility !== 'PUBLIC'
    || item.ref !== JOBS_API_URL + '/' + item.id) throw new Error('Dineout public postings no longer belong to the verified Swiggy tenant')
  if (!normalizeString(item.location?.country) || !normalizeString(item.location?.city)) throw new Error('Dineout unresolved Swiggy location country')
  businessUnit(item)
}
const mapDetail = (item, detail) => {
  if (detail?.id !== item.id || detail.company?.identifier !== 'SWIGGY' || detail.active !== true || detail.visibility !== 'PUBLIC'
    || normalizeString(detail.name) !== normalizeString(item.name) || !isDineOut(businessUnit(detail))
    || !/^(in|India)$/i.test(detail.location?.country || '')
    || normalizeString(detail.location?.city) !== normalizeString(item.location.city)
    || !hasTrustedJobUrl(detail.postingUrl) || !hasTrustedJobUrl(detail.applyUrl)) throw new Error('Dineout selected Dine Out job detail no longer matches the verified public listing')
  const sections = detail.jobAd?.sections
  const roleDescription = toPlainText(sections?.jobDescription?.text || '')
  if (!roleDescription) throw new Error('Dineout selected Dine Out job description is missing')
  const jobDescription = toPlainText(Object.values(sections).map(section => section?.text || '').join('\n'))
  const minimumQualification = toPlainText(sections.qualifications?.text || '') || null
  const department = detail.customField.find(field => field.fieldLabel === 'Department.')?.valueLabel || null
  return {
    title: normalizeString(detail.name), company: COMPANY, department,
    location: normalizeString(detail.location.fullLocation) || normalizeString(detail.location.city) + ', India',
    city: normalizeString(detail.location.city), state: normalizeString(detail.location.region) || null, country: 'India',
    jobId: String(item.id), requisitionId: normalizeString(detail.refNumber) || String(item.id),
    sourceUrl: detail.postingUrl, applyUrl: detail.applyUrl,
    employmentType: normalizeString(detail.typeOfEmployment?.label) || null,
    experienceRequired: extractJobFilterSignals({ title: detail.name, jobDescription, experienceRequired: null }).experienceProfile?.evidence || null,
    minimumQualification, preferredQualification: null, requiredSkills: [],
    postingDate: normalizeString(detail.releasedDate) || null, closingDate: null, jobDescription,
    remoteStatus: detail.location.remote ? 'Remote' : detail.location.hybrid ? 'Hybrid' : 'On-site',
  }
}

export const createDineoutScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchPage, signal } = {}) {
    fetchPage ??= url => defaultFetchPage(url, { signal })
    // The established parent domain redirects to its current first-party careers site.
    const careers = await fetchPage(LEGACY_CAREERS_URL)
    if (careers.status !== 200 || careers.url !== CAREERS_URL || !hasParentCareersLandingSignal(careers.html)) throw new Error('Dineout verified Swiggy careers handoff no longer matches the current public surface')
    const appUrl = getAppScriptUrl(careers.html)
    const app = await fetchPage(appUrl)
    if (app.status !== 200 || app.url !== appUrl || !app.html.includes('/api/jobs.json') || !/\bDineout\b/.test(app.html)
      || !app.html.includes('Explore Open Roles') || !app.html.includes('Filter by business unit')) throw new Error('Dineout verified Swiggy careers application no longer exposes the attributed public inventory')
    const feed = await getJson(fetchPage, JOBS_FEED_URL)
    if (!Array.isArray(feed?.jobs) || !Number.isInteger(feed.total) || feed.total < 0 || feed.jobs.length !== feed.total) throw new Error('Dineout incomplete Swiggy careers inventory')
    const feedUrls = new Set()
    for (const job of feed.jobs) {
      if (!normalizeString(job.t) || !normalizeString(job.c) || !normalizeString(job.b) || !hasTrustedJobUrl(job.u) || feedUrls.has(job.u)) throw new Error('Dineout incomplete Swiggy careers inventory: unresolved fields or repeated links')
      feedUrls.add(job.u)
    }

    const items = [], ids = new Set()
    let total, pagesFetched = 0
    do {
      const url = new URL(JOBS_API_URL)
      url.searchParams.set('limit', '100')
      url.searchParams.set('offset', String(items.length))
      const page = await getJson(fetchPage, url.toString())
      pagesFetched += 1
      if (!Array.isArray(page?.content) || !Number.isInteger(page.totalFound) || page.totalFound < 0 || page.offset !== items.length) throw new Error('Dineout incomplete SmartRecruiters inventory: malformed page')
      total ??= page.totalFound
      if (page.totalFound !== total || (!page.content.length && items.length < total)) throw new Error('Dineout incomplete SmartRecruiters inventory: totals changed or pagination stopped')
      for (const item of page.content) {
        validatePosting(item)
        if (ids.has(item.id)) throw new Error('Dineout incomplete SmartRecruiters inventory: repeated posting ID')
        ids.add(item.id)
        items.push(item)
      }
      if (items.length > total) throw new Error('Dineout incomplete SmartRecruiters inventory: advertised count exceeded')
    } while (items.length < total)
    // Both full inventories must be valid, but this source owns only Dine Out.
    // Reconcile every Dine Out title/city/unit with multiplicity before filtering by country.
    const feedCohort = feed.jobs.filter(job => isDineOut(job.b))
    const apiCohort = items.filter(item => isDineOut(businessUnit(item)))
    const feedKeys = feedCohort.map(job => signature(job.t, job.c, job.b)).sort()
    const apiKeys = apiCohort.map(item => signature(item.name, item.location.city, businessUnit(item))).sort()
    if (JSON.stringify(feedKeys) !== JSON.stringify(apiKeys)) {
      throw Object.assign(new Error('Dineout parent and ATS inventories disagree for the Dine Out business unit; complete target inventory unavailable (parent: ' + feedCohort.length + '; ATS: ' + apiCohort.length + ')'), {
        code: 'DINEOUT_INVENTORY_UNAVAILABLE', softFailure: true, upstreamOutage: false,
        failureKind: 'upstream_inventory_unavailable', abortRetries: true,
      })
    }
    const selected = apiCohort.filter(item => /^(in|India)$/i.test(item.location.country))
    const jobs = await mapWithConcurrency(selected, 3, async item => mapDetail(item, await getJson(fetchPage, item.ref)))
    const result = jobs.map(job => ({ ...job, source: SOURCE, link: job.applyUrl, scrapedAt: now() }))
    return attachInventoryEvidence(result, {
      status: result.length ? 'complete-inventory' : 'verified-empty', surface: JOBS_API_URL,
      firstParty: true, listingComplete: true, pagesFetched, reportedTotal: selected.length, indiaFacetCount: selected.length,
      verifiedAt: now(), reason: 'complete-dine-out-cohort-reconciled-' + apiCohort.length + '-parent-and-ats-postings-explicit-india-country',
    })
  },
})
export const run = async (options = {}) => createDineoutScraper().run(options)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
