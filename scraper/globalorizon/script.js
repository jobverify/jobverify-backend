import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  fetchJsonWithRetry,
  fetchTextWithRetry,
} from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const OUR_DATA_TEAM_URL = 'https://www.globalorizon.com/our-data-team-com'
export const OUR_HIRING_PARTNER_URL = 'https://www.globalorizon.com/the-hiring-partner-com'
export const PUBLIC_ORGANIZATION_URL =
  'https://api.thehiringpartner.com/public/organizations/by-slug/global-orizon-9ma3d'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeDomain = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

const pageIncludesAll = (html, patterns) => {
  const page = String(html ?? '')
  return patterns.every((pattern) => pattern.test(page))
}

export const hasOfficialOurDataTeamSignal = (html) =>
  pageIncludesAll(html, [
    /Global Orizon/i,
    /Data Engineering Perfected/i,
    /OurDataTeam|Our Data Team/i,
  ])

export const hasOfficialHiringPartnerSignal = (html) =>
  pageIncludesAll(html, [
    /Global Orizon/i,
    /Join Our Team/i,
    /Data Engineers/i,
    /thehiringpartner\.com/i,
  ])

export const organizationHasZeroPublicJobs = (payload) => {
  if (payload?.success !== true || !payload.data) return false

  const organization = payload.data
  return organization.slug === 'global-orizon-9ma3d'
    && organization.name === 'Global Orizon'
    && normalizeDomain(organization.website) === 'globalorizon.com'
    && Number(organization.jobsAvailable) === 0
    && Array.isArray(organization.jobs)
    && organization.jobs.length === 0
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'globalorizon',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: 'globalorizon',
  timeoutMs: 15000,
})

export const createGlobalOrizonScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const ourDataTeamHtml = await fetchText(OUR_DATA_TEAM_URL)
    if (!hasOfficialOurDataTeamSignal(ourDataTeamHtml)) {
      throw new Error('Global Orizon Our Data Team surface changed; refusing to assume zero public jobs')
    }

    const hiringPartnerHtml = await fetchText(OUR_HIRING_PARTNER_URL)
    if (!hasOfficialHiringPartnerSignal(hiringPartnerHtml)) {
      throw new Error('Global Orizon Hiring Partner surface changed; refusing to assume zero public jobs')
    }

    const organizationPayload = await fetchJson(PUBLIC_ORGANIZATION_URL)
    if (!organizationHasZeroPublicJobs(organizationPayload)) {
      throw new Error('Global Orizon public organization profile now exposes jobs or changed shape')
    }

    return []
  },
})

export const run = async (options = {}) => createGlobalOrizonScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'globalorizon')
  }
}
