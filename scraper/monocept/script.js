import path from 'node:path'
import { fileURLToPath } from 'node:url'

import MONOCEPT_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = MONOCEPT_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const CAREERS_URL = PROVIDER_METADATA.careersUrl
export const HANDOFF_URL = PROVIDER_METADATA.handoffUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1]) || null
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

const sameUrl = (left, right) => String(left ?? '').replace(/\/$/, '') === String(right ?? '').replace(/\/$/, '')

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html).toLowerCase()
  const title = (extractTitle(html) || '').toLowerCase()

  return title.includes('monocept')
    && title.includes('careers')
    && normalized.includes('insurtech careers')
    && normalized.includes('explore opportunities')
    && normalized.includes('hyderabad')
}

export const hasTurboHireShellSignal = (html = '') => {
  const normalized = normalizeWhitespace(html).toLowerCase()
  const title = (extractTitle(html) || '').toLowerCase()

  return title.includes('monocept consulting pvt. ltd. - career page')
    && normalized.includes('career page')
    && normalized.includes('turbohire')
}

export const hasServerRenderedJobsSignal = (html = '') =>
  /(current openings|open roles|job openings|apply now|job description)/i.test(String(html ?? ''))

export const createMonoceptScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)

    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, CAREERS_URL)
      || !hasOfficialCareersSignal(careersPage.html)
      || !careersPage.html.includes(HANDOFF_URL)
    ) {
      throw new Error('Monocept first-party careers page no longer matches the trusted handoff surface')
    }

    const handoffPage = await fetchPage(HANDOFF_URL)
    if (
      handoffPage.status !== 200
      || !sameUrl(handoffPage.url, HANDOFF_URL)
      || !hasTurboHireShellSignal(handoffPage.html)
    ) {
      throw new Error('Monocept TurboHire handoff no longer matches the verified JS-shell baseline')
    }

    if (hasServerRenderedJobsSignal(handoffPage.html)) {
      throw new Error('Monocept TurboHire handoff now exposes public server-rendered jobs and needs a real scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createMonoceptScraper().run(options)

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
