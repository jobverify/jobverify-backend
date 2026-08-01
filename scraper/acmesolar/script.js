import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'acmesolar'
export const COMPANY = 'ACME Solar'
export const COMPANY_DOMAIN = 'acmesolar.in'
export const VERIFIED_AT = '2026-07-19'
export const HOMEPAGE_URL = 'https://www.acmesolar.in/'
export const CAREERS_URL = 'https://www.acmesolar.in/career'
export const CAREER_FORM_URL = 'https://www.acmesolar.in/career_form'
export const APPLY_EMAIL = 'hr@acme.in'

const VERIFIED_PAGE_URLS = [
  HOMEPAGE_URL,
  CAREERS_URL,
  CAREER_FORM_URL,
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const extractScriptAssetUrls = (html, baseUrl = HOMEPAGE_URL) => {
  const urls = new Set()

  for (const match of String(html ?? '').matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi)) {
    try {
      urls.add(new URL(match[1], baseUrl).toString())
    } catch {
      // Ignore malformed script URLs; the caller will fail if no verified bundle remains.
    }
  }

  return [...urls]
}

export const hasOfficialAppShellSignal = (html) => {
  const page = String(html ?? '')

  return /<div[^>]+\bid=["']root["'][^>]*>/i.test(page)
    && /\/assets\/index-[A-Za-z0-9_-]+\.js/i.test(page)
    && /\/media\/images\/favicon\.png/i.test(page)
}

export const hasOfficialCareersBundleSignal = (text) => {
  const bundle = String(text ?? '')

  return /Career Opportunities at ACME Solar|For career opportunities/i.test(bundle)
    && /ACME Solar/i.test(bundle)
    && /\/career_form/i.test(bundle)
    && new RegExp(escapeRegex(APPLY_EMAIL), 'i').test(bundle)
}

export const hasPublicJobListingsSignal = (text) => {
  const page = String(text ?? '')
  const normalized = normalizeWhitespace(page)

  if (
    /boards-api\.greenhouse|job-boards\.greenhouse|greenhouse\.io|lever\.co|smartrecruiters|workdayjobs|darwinbox|peoplestrong/i
      .test(page)
  ) {
    return true
  }

  if (/\/api\/(?:jobs?|openings|positions)\b|jobs\/v1|job\/detail/i.test(page)) {
    return true
  }

  return /current openings|open positions|job openings|vacancies/i.test(normalized)
    && /apply now|job detail|role|position|location|department/i.test(normalized)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  redirect: 'follow',
  label: SOURCE,
  timeoutMs: 15000,
})

const chooseVerifiedBundleUrl = (pages) => {
  const scriptUrls = pages.flatMap(({ html, url }) => extractScriptAssetUrls(html, url))
  return [...new Set(scriptUrls)]
    .find((url) => /\/assets\/index-[A-Za-z0-9_-]+\.js(?:$|\?)/i.test(url)) || null
}

const assertVerifiedAppShell = ({ url, html }) => {
  if (hasOfficialAppShellSignal(html)) return
  throw new Error(`${COMPANY} ${url} no longer matches the verified official ACME Solar web app shell`)
}

export const createAcmeSolarScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const pages = await Promise.all(
      VERIFIED_PAGE_URLS.map(async (url) => ({
        url,
        html: await fetchText(url),
      })),
    )

    pages.forEach(assertVerifiedAppShell)

    const bundleUrl = chooseVerifiedBundleUrl(pages)
    if (!bundleUrl) {
      throw new Error(`${COMPANY} verified careers bundle no longer exposes the official app asset`)
    }

    const bundleText = await fetchText(bundleUrl)
    if (!hasOfficialCareersBundleSignal(bundleText)) {
      throw new Error(`${COMPANY} careers bundle no longer matches the verified no-public-jobs career form surface`)
    }

    if (hasPublicJobListingsSignal(bundleText)) {
      throw new Error(`${COMPANY} public jobs surface now appears available in the official careers bundle`)
    }

    return []
  },
})

export const run = async (options = {}) => createAcmeSolarScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
