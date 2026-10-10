import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

import { CBNITS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CBNITS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersShellSignal = (html = '') => {
  const raw = String(html ?? '')
  const legacy = /CBNITS/i.test(raw)
    && /Agentic AI, Cybersecurity & Intelligent Enterprise Solutions/i.test(raw)
    && /<div id="root"><\/div>/i.test(raw)
    && /\/assets\/index-[A-Za-z0-9_-]+\.js/i.test(raw)
  let current = false
  try {
    const data = JSON.parse(raw.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1] || 'null')
    current = data?.page === '/career' && data?.isFallback === false
      && /CBNITS/i.test(raw) && /id="__next"/.test(raw)
      && /\/_next\/static\/chunks\/pages\/career-[A-Za-z0-9_-]+\.js/.test(raw)
  } catch { /* A malformed current route is not a verified surface. */ }
  return legacy || current
}

export const hasServerRenderedJobsSignal = (html = '') =>
  /current openings|apply now|job openings|latest job openings here|href=["'][^"']*(apply|job|career)[^"']*["']/i.test(
    normalizeWhitespace(html),
  )

export const extractBundleUrl = (html = '') => {
  const raw = String(html ?? '')
  const legacy = raw.match(/<script[^>]+type=["']module["'][^>]+src=["'](\/assets\/index-[A-Za-z0-9_-]+\.js)["']/i)
  const current = raw.match(/<script[^>]+src=["'](\/_next\/static\/chunks\/pages\/career-[A-Za-z0-9_-]+\.js)["']/i)
  const match = current || legacy
  return match ? new URL(match[1], CAREERS_URL).toString() : null
}

export const hasOfficialCareersBundleSignal = (javascript = '') => {
  const bundle = String(javascript ?? '')
  const identity = /https:\/\/api\.cbnits\.com/i.test(bundle)
    && /getAllCareerPost/i.test(bundle)
    && /Join The CBNITS Team/i.test(bundle)
    && /Current career opportunities at CBNITS/i.test(bundle)
  const legacy = /path:["']\/career["']/i.test(bundle)
  const current = /\.push\(\["\/career",function/.test(bundle)
    && /Careers at CBNITS \| AI & Engineering Opportunities/.test(bundle)
    && /GET_CAREER_POST:"career\/getallCareerPost"/.test(bundle)
    && /let ([A-Za-z_$][\w$]*)=await \(0,[^)]+\)\(\);null==\1\|\|\1\.ack/.test(bundle)
    && !/\b(?:careerTitle|careerDescription|careerLocation|JobPosting)\b|\.(?:data|jobs)\.map\(/i.test(bundle)
  return identity && (legacy || current)
}

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
  const html = await fetchText(CAREERS_URL)

  if (hasServerRenderedJobsSignal(html)) {
    throw new Error('CBNITS server-rendered public jobs appeared on the verified SPA shell route')
  }

  if (!hasOfficialCareersShellSignal(html)) {
    throw new Error('CBNITS verified first-party careers shell changed materially')
  }

  const bundleUrl = extractBundleUrl(html)
  const bundle = bundleUrl ? await fetchText(bundleUrl) : ''
  if (!hasOfficialCareersBundleSignal(bundle)) {
    throw new Error('CBNITS verified first-party careers route bundle changed materially')
  }

  return attachInventoryEvidence([], {
    status: 'discovery-only', surface: CAREERS_URL, firstParty: true, listingComplete: false,
    pagesFetched: 1, reportedTotal: null, indiaFacetCount: null, verifiedAt: now(),
    reason: 'verified-careers-view-does-not-publish-the-fetched-legacy-api-records',
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
