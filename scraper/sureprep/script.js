import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SUREPREP_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SUREPREP_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const LOGIN_URL = PROVIDER_METADATA.loginUrl
export const OFFICIAL_LOGIN_TITLE = PROVIDER_METADATA.officialLoginTitle
export const OFFICIAL_LOGIN_PROVIDER = PROVIDER_METADATA.officialLoginProvider

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

export const hasOfficialLoginSignal = (html = '') => {
  const normalized = normalizeWhitespace(html).toLowerCase()
  const title = (extractTitle(html) || '').toLowerCase()

  return title.includes('sureprep fileroom login')
    && normalized.includes('welcome')
    && normalized.includes('sign in with thomson reuters account')
    && normalized.includes('sureprep')
  }

export const hasPublicJobsSignal = (html = '') =>
  /(current openings|open roles|job openings|apply now|careers? at sureprep)/i.test(String(html ?? ''))

export const createSurePrepScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const loginPage = await fetchPage(LOGIN_URL)

    if (
      loginPage.status !== 200
      || !sameUrl(loginPage.url, LOGIN_URL)
      || !hasOfficialLoginSignal(loginPage.html)
    ) {
      throw new Error('SurePrep verified login surface no longer matches the trusted first-party exact-name surface')
    }

    if (hasPublicJobsSignal(loginPage.html)) {
      throw new Error('SurePrep login surface now exposes public jobs content and needs a real scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createSurePrepScraper().run(options)

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
