import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = 'talentsprint'
export const COMPANY_NAME = 'TalentSprint'
export const COMPANY = COMPANY_NAME
export const COMPANY_ID = 'main'
export const VERIFIED_ON = '2026-07-25'
export const OFFICIAL_SITE_URL = 'https://talentsprint.com/'
export const CAREERS_PAGE_URL = 'https://talentsprint.com/careers/'
export const DARWINBOX_ORIGIN = 'https://talentsprint.darwinbox.in'
export const OFFICIAL_CAREERS_HANDOFF_URL = `${DARWINBOX_ORIGIN}/ms/candidate/careers`
export const PUBLIC_ALL_JOBS_URL = `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/allJobs`

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&apos;|&#39;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/+$/g, '')
  } catch {
    return String(value ?? '').replace(/\/+$/g, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

export const extractDarwinboxHandoffUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1]
    const text = normalizeWhitespace(match[2])
    if (!/talentsprint\.darwinbox\.in/i.test(href)) continue
    if (!/view job openings|join our team|openings|careers|jobs/i.test(text)) continue

    try {
      return new URL(href, CAREERS_PAGE_URL).toString().replace(/\/+$/g, '')
    } catch {
      return null
    }
  }

  return null
}

const hasOfficialCareersPageSignal = (html = '') => {
  const text = normalizeWhitespace(html)
  return /talentsprint.*careers.*job opportunities/i.test(extractTitle(html) || '')
    && /Go Beyond the Ordinary/i.test(text)
    && /future-proof, modern-day workforce/i.test(text)
    && /View Job Openings|Join Our Team/i.test(text)
}

export const hasOfficialCareersHandoffSignal = (html = '') =>
  hasOfficialCareersPageSignal(html)
  && sameUrl(extractDarwinboxHandoffUrl(html), OFFICIAL_CAREERS_HANDOFF_URL)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const createConfiguredDarwinboxScraper = () => createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

export const createTalentSprintScraper = ({
  now = () => new Date().toISOString(),
  darwinboxScraper = createConfiguredDarwinboxScraper(),
} = {}) => ({
  ...darwinboxScraper,
  async run({ fetchText = defaultFetchText, ...darwinboxOptions } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)

    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('The verified TalentSprint careers page changed materially')
    }

    if (!sameUrl(extractDarwinboxHandoffUrl(careersHtml), OFFICIAL_CAREERS_HANDOFF_URL)) {
      throw new Error('The verified TalentSprint Darwinbox handoff changed materially')
    }

    const jobs = await darwinboxScraper.run(darwinboxOptions)
    const scrapedAt = now()
    return jobs.map((job) => ({ ...job, scrapedAt }))
  },
})

export const run = async (options = {}) => createTalentSprintScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
