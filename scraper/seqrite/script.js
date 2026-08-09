import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'seqrite'
export const COMPANY_NAME = 'Seqrite'
export const DARWINBOX_COMPANY_ID = 'main'
export const DARWINBOX_ORIGIN = 'https://lifecycleqhtl.darwinbox.in'
export const OFFICIAL_CAREERS_URL = 'https://www.quickheal.co.in/jobs-careers-at-quick-heal'
export const OFFICIAL_CAREERS_HANDOFF_URL = `${DARWINBOX_ORIGIN}/ms/candidate/careers`
export const PUBLIC_PORTAL_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`
export const VERIFIED_ON = '2026-07-25'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(
    /https:\/\/lifecycleqhtl\.darwinbox\.in\/ms\/candidate\/careers/i,
  )
  return match?.[0] || null
}

export const hasOfficialSeqriteCareersSignals = (html = '') => {
  const text = normalizeWhitespace(html).toLowerCase()

  return /^Careers at Quick Heal \| Cybersecurity Jobs & Career Opportunities$/i.test(extractTitle(html))
    && text.includes('work with purpose. grow from the experience. innovate to shape the future with quick heal')
    && text.includes('customer centricity is one the core values of seqrite')
    && text.includes('apply for a job')
    && text.includes('join our innovative team')
    && extractOfficialDarwinboxUrl(html) === OFFICIAL_CAREERS_HANDOFF_URL
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobverify scraper)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

export const createSeqriteScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, fetchListingPage, ...options } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialSeqriteCareersSignals(careersHtml)) {
      throw new Error('Seqrite verified official careers page no longer matches the verified public surface')
    }

    const jobs = await darwinboxScraper.run({ ...options, fetchListingPage })
    const scrapedAt = now()

    return jobs.map((job) => ({ ...job, scrapedAt }))
  },
})

export const run = async (options = {}) => createSeqriteScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
