import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG from './catalog.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.source
export const COMPANY = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.companyName
export const PROVIDER_METADATA = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG
export const VERIFIED_ON = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.verifiedOn
export const CAREERS_LANDING_URL = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.careersLandingUrl
export const JOBS_PORTAL_URL = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.companyCareerPage
export const CEIPAL_WIDGET_URL = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.ceipalWidgetUrl
export const CEIPAL_WIDGET_SCRIPT_URL = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.ceipalWidgetScriptUrl
export const CEIPAL_API_KEY = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.ceipalApiKey
export const CEIPAL_CAREER_PORTAL_ID = SOLUGENIX_INDIA_PRIVATE_LIMITED_CATALOG.ceipalCareerPortalId

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()

export const hasVerifiedCareersLandingSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Solugenix Careers')
    && normalized.includes('All Openings')
    && normalized.includes('Refer a Candidate')
    && normalized.includes('India')
}

export const hasVerifiedJobsPortalSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return normalized.includes('Jobs Portal')
    && rawHtml.includes(CEIPAL_WIDGET_SCRIPT_URL)
    && rawHtml.includes(`data-ceipal-api-key="${CEIPAL_API_KEY}"`)
    && rawHtml.includes(`data-ceipal-career-portal-id="${CEIPAL_CAREER_PORTAL_ID}"`)
}

export const hasBlockedWidgetSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('N/A')
    && normalized.includes('Easy Apply')
    && !/class=["'][^"']*job-title/i.test(String(html ?? ''))
}

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  const careersLandingHtml = await fetchText(CAREERS_LANDING_URL)
  if (!hasVerifiedCareersLandingSignal(careersLandingHtml)) {
    throw new Error('Response is not the verified Solugenix careers landing page')
  }

  const jobsPortalHtml = await fetchText(JOBS_PORTAL_URL)
  if (!hasVerifiedJobsPortalSignal(jobsPortalHtml)) {
    throw new Error('Response is not the verified Solugenix jobs portal')
  }

  const widgetHtml = await fetchText(CEIPAL_WIDGET_URL)
  if (hasBlockedWidgetSignal(widgetHtml)) {
    return []
  }

  throw new Error('Solugenix now exposes trustworthy public job records through the CEIPAL widget surface')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
