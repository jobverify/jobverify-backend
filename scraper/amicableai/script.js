import path from 'node:path'
import { fileURLToPath } from 'node:url'

import AMICABLE_AI_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AMICABLE_AI_CATALOG.source
export const COMPANY = AMICABLE_AI_CATALOG.companyName
export const VERIFIED_AT = AMICABLE_AI_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = AMICABLE_AI_CATALOG.verifiedSurfaceSummary
export const HOMEPAGE_URL = AMICABLE_AI_CATALOG.officialHomepageUrl
export const CAREERS_URL = AMICABLE_AI_CATALOG.companyCareerPage
export const SCREENLOOP_BOARD_URL = AMICABLE_AI_CATALOG.officialScreenloopBoardUrl
export const SPECULATIVE_APPLY_EMAIL = AMICABLE_AI_CATALOG.officialSpeculativeApplyEmail

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/[â€™]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),
)

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

const extractJsonArrayAfterKey = (value, key) => {
  const text = decodeHtmlEntities(value)
  const token = `"${key}":[`
  const start = text.indexOf(token)

  if (start === -1) {
    return null
  }

  let index = start + token.length - 1
  let depth = 0
  let inString = false
  let escaped = false

  for (; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '[') {
      depth += 1
      continue
    }

    if (char === ']') {
      depth -= 1
      if (depth === 0) {
        return text.slice(start + token.length - 1, index + 1)
      }
    }
  }

  return null
}

const extractScreenloopJobPosts = (html = '') => {
  const serializedJobPosts = extractJsonArrayAfterKey(html, 'jobPosts')

  if (!serializedJobPosts) {
    throw new Error('Amicable AI verified stale Screenloop board no longer exposes the known jobPosts payload')
  }

  const jobPosts = JSON.parse(serializedJobPosts)

  if (!Array.isArray(jobPosts) || jobPosts.length === 0) {
    throw new Error('Amicable AI verified stale Screenloop board no longer exposes job entries')
  }

  return jobPosts
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*amicable \| Relationships, divorce, (?:prenups, )?separation, co-parenting\s*<\/title>/i.test(page)
    && sameUrl(extractHomepageCareerUrl(page), CAREERS_URL)
    && (
      normalized.includes("we're the trusted legal service for separating couples")
      || normalized.includes("we're the trusted legal service for couples")
    )
}

export const extractHomepageCareerUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = normalizeWhitespace(match[2])
    if (label !== 'Careers') continue

    return toAbsoluteUrl(match[1], HOMEPAGE_URL)
  }

  return null
}

export const hasNoOpeningsCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*Careers: explore our vacancies \| amicable\s*<\/title>/i.test(page)
    && normalized.includes('explore a career at amicable')
    && normalized.includes('although we currently have no open positions')
    && normalized.includes('speculative applicant')
    && normalized.includes('future opportunities')
    && new RegExp(`mailto:${SPECULATIVE_APPLY_EMAIL.replace('.', '\\.')}`, 'i').test(page)
    && /href=["']#explore-vacancies["']/i.test(page)
}

export const extractScreenloopBoardUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<iframe\b[^>]*src=["'](https:\/\/app\.screenloop\.com\/careers\/amicable\/?)["'][^>]*>/i,
  )

  return match?.[1]?.replace(/\/$/, '') || null
}

export const extractScreenloopCanonicalUrl = (html = '') =>
  String(html ?? '').match(
    /<meta\s+property=["']og:url["']\s+content=["'](https:\/\/app\.screenloop\.com\/careers\/amicable\/?)["']/i,
  )?.[1]?.replace(/\/$/, '') || null

export const extractScreenloopJobTitles = (html = '') =>
  extractScreenloopJobPosts(html)
    .map((job) => normalizeWhitespace(job?.name))
    .filter(Boolean)

export const screenloopBoardHasIndiaRoles = (html = '') =>
  extractScreenloopJobPosts(html).some((job) =>
    /\bindia\b/i.test([
      normalizeWhitespace(job?.name),
      normalizeWhitespace(job?.location?.name),
      normalizeWhitespace(job?.location?.address),
      normalizeWhitespace(job?.location?.country),
    ].filter(Boolean).join(' ')),
  )

export const hasStaleScreenloopBoardSignal = (html = '') => {
  const page = String(html ?? '')

  if (!/<title>\s*Screenloop\s*<\/title>/i.test(page)) {
    return false
  }

  try {
    return sameUrl(extractScreenloopCanonicalUrl(page), SCREENLOOP_BOARD_URL)
      && extractScreenloopJobTitles(page).length > 0
  } catch {
    return false
  }
}

export const extractStaleScreenloopJobTitles = extractScreenloopJobTitles
export const hasVerifiedScreenloopBoardSignal = hasStaleScreenloopBoardSignal

export const createAmicableAiScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !sameUrl(homepage.url, HOMEPAGE_URL) || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Amicable AI verified official homepage changed materially')
    }

    if (!sameUrl(extractHomepageCareerUrl(homepage.html), CAREERS_URL)) {
      throw new Error('Amicable AI verified homepage careers navigation changed materially')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (careersPage.status !== 200 || !sameUrl(careersPage.url, CAREERS_URL) || !hasNoOpeningsCareersSignal(careersPage.html)) {
      throw new Error('Amicable AI verified no-openings careers surface changed materially')
    }

    if (!sameUrl(extractScreenloopBoardUrl(careersPage.html), SCREENLOOP_BOARD_URL)) {
      throw new Error('Amicable AI verified careers handoff to the hidden Screenloop board changed materially')
    }

    const screenloopBoardPage = await fetchPage(SCREENLOOP_BOARD_URL)

    if (
      screenloopBoardPage.status !== 200
      || !sameUrl(screenloopBoardPage.url, SCREENLOOP_BOARD_URL)
      || !hasVerifiedScreenloopBoardSignal(screenloopBoardPage.html)
    ) {
      throw new Error('Amicable AI verified Screenloop board changed materially')
    }

    if (screenloopBoardHasIndiaRoles(screenloopBoardPage.html)) {
      throw new Error('Amicable AI verified no-public-careers surface no longer holds because the Screenloop board now exposes India roles')
    }

    return []
  },
})

export const run = async (options = {}) => createAmicableAiScraper().run(options)

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
