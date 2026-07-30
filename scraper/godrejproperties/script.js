import path from 'node:path'
import { fileURLToPath } from 'node:url'

import GODREJ_PROPERTIES_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_PATTERNS = [
  /vacancy-details\?SRNO=\d+/i,
  /data-job-id=/i,
  /<a[^>]+href=["'][^"']*(?:\/jobs?\/|\/careerweb\/vacancy-details)[^"']*["']/i,
]

export const PROVIDER_METADATA = GODREJ_PROPERTIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_US_URL = PROVIDER_METADATA.aboutUsUrl
export const SHARED_CAREERS_URL = PROVIDER_METADATA.officialCareersHandoffUrl

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/Â©|©/g, 'Â©')
  .replace(/(\d{4})\s+\./g, '$1.')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const matchesExpectedUrl = (value, expected) => {
  try {
    const actualUrl = new URL(String(value ?? ''))
    const expectedUrl = new URL(expected)
    const normalizePath = (pathname) => pathname === '/' ? '/' : pathname.replace(/\/+$/, '')

    return actualUrl.hostname.toLowerCase() === expectedUrl.hostname.toLowerCase()
      && normalizePath(actualUrl.pathname) === normalizePath(expectedUrl.pathname)
      && actualUrl.search === expectedUrl.search
  } catch {
    return false
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const pageExposesPublicJobListings = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const extractWorkWithUsUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/careers\.godrejindustries\.com\/in\/en\/godrejproperties/i)
  return match ? match[0] : null
}

export const hasOfficialHomepageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  if (
    normalized.includes('Godrej Properties')
    && normalized.includes('Crafting spaces that spark joy, one community, one family, one home at a time.')
    && /Copyright\s*(?:Â©|©|&copy;)?\s*2026\s*\.?\s*Godrej Properties/i.test(normalized)
    && extractWorkWithUsUrl(html) === SHARED_CAREERS_URL
  ) {
    return true
  }

  return normalized.includes('Godrej Properties')
    && normalized.includes('Crafting spaces that spark joy, one community, one family, one home at a time.')
    && normalized.includes('Copyright © 2026. Godrej Properties')
    && extractWorkWithUsUrl(html) === SHARED_CAREERS_URL
}

export const hasAboutUsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('About Godrej Properties')
    && normalized.includes('At Godrej Properties, we are driven by a singular purpose, Crafting Joy.')
    && normalized.includes('As part of the Godrej Industries Group, we combine a 129-year legacy of trust and excellence with a forward-looking vision to shape the future of urban India.')
    && normalized.includes('At the heart of our journey is our team a diverse, driven collective united by purpose and ambition.')
    && extractWorkWithUsUrl(html) === SHARED_CAREERS_URL
}

export const hasSharedCareersShellSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Work with us')
    && normalized.includes('Work with Godrej Properties')
    && normalized.includes('Discover exciting roles across 8 dynamic business units')
    && normalized.includes('Connect with us')
    && normalized.includes('© Godrej Industries Limited 2026. All rights reserved.')
    && !pageExposesPublicJobListings(html)
}

export const createGodrejPropertiesScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (Number(homepage?.status) !== 200 || !matchesExpectedUrl(homepage?.url, HOMEPAGE_URL)) {
      throw new Error('Godrej Properties verified first-party homepage no longer matches the known public surface')
    }

    if (pageExposesPublicJobListings(homepage?.html)) {
      throw new Error('Godrej Properties homepage now appears to expose a public jobs surface')
    }

    if (!hasOfficialHomepageSignal(homepage?.html)) {
      throw new Error('Godrej Properties verified first-party homepage no longer matches the known public surface')
    }

    const aboutPage = await fetchPage(ABOUT_US_URL)

    if (Number(aboutPage?.status) !== 200 || !matchesExpectedUrl(aboutPage?.url, ABOUT_US_URL)) {
      throw new Error('Godrej Properties verified first-party about page no longer matches the known public surface')
    }

    if (pageExposesPublicJobListings(aboutPage?.html)) {
      throw new Error('Godrej Properties about page now appears to expose a public jobs surface')
    }

    if (!hasAboutUsSignal(aboutPage?.html)) {
      throw new Error('Godrej Properties verified first-party about page no longer matches the known public surface')
    }

    const careersShell = await fetchPage(SHARED_CAREERS_URL)

    if (Number(careersShell?.status) !== 200 || !matchesExpectedUrl(careersShell?.url, SHARED_CAREERS_URL)) {
      throw new Error('Godrej Properties shared Godrej Properties careers shell no longer matches the verified handoff surface')
    }

    if (pageExposesPublicJobListings(careersShell?.html)) {
      throw new Error('Godrej Properties shared Godrej Properties careers shell now appears to expose a public jobs surface')
    }

    if (!hasSharedCareersShellSignal(careersShell?.html)) {
      throw new Error('Godrej Properties shared Godrej Properties careers shell no longer matches the verified handoff surface')
    }

    return []
  },
})

export const run = async (options = {}) => createGodrejPropertiesScraper().run(options)

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
