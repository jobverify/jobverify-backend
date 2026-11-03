import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { composeAbortSignals, fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { readNativeDocument } from '../../scraper-support/utils/activeNativeHtml.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { DENTALKART_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const SOURCE = DENTALKART_CATALOG.source
export const COMPANY = DENTALKART_CATALOG.companyName
export const VERIFIED_AT = DENTALKART_CATALOG.verifiedOn
export const HOMEPAGE_URL = DENTALKART_CATALOG.homepageUrl
export const ABOUT_URL = DENTALKART_CATALOG.aboutPageUrl
export const CAREERS_URL = DENTALKART_CATALOG.companyCareerPage
export const CAREERS_PORTAL_URL = DENTALKART_CATALOG.officialCareersHandoffUrl
export const CAREERS_API_URL = DENTALKART_CATALOG.zohoJobsApiUrl
export const VERIFIED_SURFACE_SUMMARY = DENTALKART_CATALOG.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const decodeHtml = value => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
  .replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
const text = value => decodeHtml(value).replace(/\s+/g, ' ').trim()
const hasHandoff = html => readNativeDocument(html).nodes(node => node.tag === 'a'
  && node.attrs.href === CAREERS_PORTAL_URL).length > 0

export const hasOfficialHomepageSignal = html => {
  const page = String(html ?? '')
  return /^Dentalkart - India's Largest Online Dental Store(?: by SKU Count)?$/.test(text(page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]))
    && /VASA DENTICITY LIMITED/i.test(page)
    && hasHandoff(page)
}

export const hasOfficialAboutPageSignal = html => {
  const page = String(html ?? '')
  return /<title>\s*About Us[\s\S]*?Dentalkart\s*<\/title>/i.test(page)
    && /VASA DENTICITY LIMITED/i.test(page)
    && hasHandoff(page)
}

export const hasOfficialCareersShellSignal = html => {
  const page = String(html ?? '')
  return /<title>\s*Buy Dental Products\s*<\/title>/i.test(page)
    && /\/_next\/static\/chunks\/app\/careers\/page-[^"']+\.js/i.test(page)
    && hasHandoff(page)
}

const readHiddenJson = (html, id) => {
  const inputs = [...String(html).matchAll(/<input\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)]
    .map(match => Object.fromEntries([...match[0].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)]
      .map(attribute => [attribute[1], attribute[3]])))
    .filter(attributes => attributes.id === id)
  if (inputs.length !== 1 || inputs[0].type !== 'hidden') {
    throw new Error('Dentalkart verified Zoho portal contract is missing unique ' + id + ' data')
  }
  try { return JSON.parse(decodeHtml(inputs[0].value)) } catch (cause) {
    throw new Error('Dentalkart verified Zoho portal contract contains invalid ' + id + ' data', { cause })
  }
}

const validateRecords = records => {
  if (!Array.isArray(records)) throw new Error('Dentalkart Zoho record contract is invalid')
  const seen = new Set()
  for (const job of records) {
    if (!/^\d+$/.test(String(job?.id ?? '')) || !text(job?.Posting_Title || job?.Job_Opening_Name)
      || !text(job?.Country) || typeof job?.Publish !== 'boolean' || typeof job?.Is_Locked !== 'boolean') {
      throw new Error('Dentalkart Zoho record contract is malformed')
    }
    if (seen.has(String(job.id))) throw new Error('Dentalkart Zoho inventory contains duplicate records')
    seen.add(String(job.id))
  }
}

export const readPortalInventory = html => {
  const meta = readHiddenJson(html, 'meta')
  if (text(String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) !== 'Jobs at VASA Denticity Limited'
    || meta?.org_info?.company_name !== 'VASA Denticity Limited'
    || meta?.org_info?.website !== 'www.dentalkart.com'
    || meta?.list_url !== CAREERS_PORTAL_URL || meta?.page_name !== 'Careers' || meta?.source !== 'CareerSite') {
    throw new Error('Dentalkart verified Zoho portal identity no longer matches the official employer')
  }
  const jobs = readHiddenJson(html, 'jobs')
  validateRecords(jobs)
  return jobs
}

const canonicalJobUrl = record => {
  try {
    const url = new URL(record.$url)
    if (url.origin !== 'https://dentalkart.zohorecruit.in'
      || !new RegExp('^/jobs/Careers/' + record.id + '/[^/]+$').test(url.pathname)
      || url.search !== '?source=CareerSite' || url.hash) throw new Error('unexpected URL')
    return url.toString()
  } catch (cause) { throw new Error('Dentalkart active Zoho record has an unverified detail URL', { cause }) }
}

const postingDate = value => {
  const match = text(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2])))
  return date.getUTCFullYear() === Number(match[3]) && date.getUTCMonth() === Number(match[1]) - 1
    && date.getUTCDate() === Number(match[2]) ? date.toISOString().slice(0, 10) : null
}

export const extractIndiaJobs = (payload, { portalJobs } = {}) => {
  if (payload?.code !== 'success' || !Array.isArray(payload?.data) || payload?.info?.page_name !== 'Careers') {
    throw new Error('Dentalkart Zoho API success contract no longer matches the verified careers page')
  }
  if (payload.info.more_records === true) throw new Error('Dentalkart Zoho API pagination indicates incomplete inventory')
  validateRecords(payload.data)
  if (portalJobs) {
    validateRecords(portalJobs)
    const portalById = new Map(portalJobs.map(job => [String(job.id), job]))
    if (payload.data.length !== portalJobs.length || payload.data.some(job => {
      const portalJob = portalById.get(String(job.id))
      return !portalJob || job.Publish !== portalJob.Publish || job.Is_Locked !== portalJob.Is_Locked
        || text(job.Country) !== text(portalJob.Country)
        || text(job.Posting_Title || job.Job_Opening_Name) !== text(portalJob.Posting_Title || portalJob.Job_Opening_Name)
    })) throw new Error('Dentalkart Zoho API inventory is incomplete or differs from the public portal')
  }
  return payload.data.filter(job => job.Publish === true && job.Is_Locked === false && text(job.Country) === 'India')
    .map(job => {
      const city = text(job.City)
      const state = text(job.State)
      const description = text(job.Job_Description)
      const sourceUrl = canonicalJobUrl(job)
      if (!city || !state || !description) throw new Error('Dentalkart active India record lacks location or description')
      return {
        title: text(job.Posting_Title || job.Job_Opening_Name), company: COMPANY,
        jobId: String(job.id), requisitionId: String(job.id), sourceUrl, applyUrl: sourceUrl,
        location: [city, state, 'India'].join(', '), city: normalizeCity(city), state, country: 'India',
        department: text(job.Industry) || null,
        employmentType: /^full\s*time$/i.test(text(job.Job_Type)) ? 'Full-time' : text(job.Job_Type) || null,
        experienceRequired: text(job.Work_Experience) || null, jobDescription: description,
        minimumQualification: null, preferredQualification: null, requiredSkills: [],
        postingDate: postingDate(job.Date_Opened), closingDate: null,
      }
    })
}

const defaultFetchPage = async (url, { signal } = {}) => {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }, redirect: 'follow', signal: composeAbortSignals(signal, AbortSignal.timeout(15000)) })
  return { status: response.status, url: response.url, html: await response.text() }
}
const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, { signal, attempts: 1, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, label: SOURCE, timeoutMs: 15000 })

export const createDentalkartScraper = () => ({
  async run({ fetchPage = defaultFetchPage, fetchJson = defaultFetchJson, now = () => new Date().toISOString(), signal } = {}) {
    const readPage = async (url, validate, label) => {
      signal?.throwIfAborted()
      const page = await fetchPage(url, { signal })
      signal?.throwIfAborted()
      if (page.status !== 200 || (page.url || page.finalUrl || url) !== url || (validate && !validate(page.html))) {
        throw new Error('Dentalkart verified ' + label + ' no longer matches the official surface')
      }
      return page.html
    }
    await readPage(HOMEPAGE_URL, hasOfficialHomepageSignal, 'official homepage')
    await readPage(ABOUT_URL, hasOfficialAboutPageSignal, 'about page')
    await readPage(CAREERS_URL, hasOfficialCareersShellSignal, 'careers handoff')
    const portalJobs = readPortalInventory(await readPage(CAREERS_PORTAL_URL, null, 'Zoho portal'))
    signal?.throwIfAborted()
    const payload = await fetchJson(CAREERS_API_URL, { signal })
    signal?.throwIfAborted()
    const scrapedAt = now()
    let extracted = extractIndiaJobs(payload, { portalJobs })
    let complete = false, reason = 'closing-native-inventory-unavailable'
    let closingRecords = null
    const canonical = records => JSON.stringify([...records].sort((a, b) => String(a.id).localeCompare(String(b.id))),
      (_, value) => value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value)
    try {
      const closing = await fetchJson(CAREERS_API_URL, { signal })
      signal?.throwIfAborted()
      extractIndiaJobs(closing)
      closingRecords = closing.data
      extractIndiaJobs(closing, { portalJobs })
      complete = canonical(payload.data) === canonical(closing.data)
      reason = complete ? 'current-legal-employer-and-complete-stable-public-zoho-inventory' : 'closing-native-role-records-changed'
    } catch (error) {
      signal?.throwIfAborted()
      if (!extracted.length) throw error
    }
    if (closingRecords) {
      const openingById = new Map(payload.data.map(row => [String(row.id), row]))
      const closingById = new Map(closingRecords.map(row => [String(row.id), row]))
      const count = extracted.length
      extracted = extracted.filter(job => closingById.has(job.jobId)
        && canonical([openingById.get(job.jobId)]) === canonical([closingById.get(job.jobId)]))
      if (extracted.length !== count) reason += `;closing-native-roles-withheld:${count - extracted.length}`
    }
    return attachInventoryEvidence(extracted.map(job => ({ ...job, source: SOURCE, link: job.applyUrl, scrapedAt,
      sourceListingComplete: complete, sourceScopeComplete: complete, lifecycleCleanupAllowed: complete })), {
      status: complete ? portalJobs.length ? 'complete-inventory' : 'verified-empty' : 'discovery-only',
      surface: CAREERS_API_URL, firstParty: true, listingComplete: complete,
      reportedTotal: portalJobs.length, indiaFacetCount: complete ? extracted.length : null,
      pagesFetched: 6, verifiedAt: scrapedAt, reason,
    })
  },
})
export const run = async (options = {}) => createDentalkartScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
