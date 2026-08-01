import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lsdevicespltd'
export const COMPANY = 'LS Devices (P) Ltd'
export const VERIFIED_AT = '2026-07-13'
export const HOMEPAGE_URL = 'http://lsdevices.com/'
export const WWW_HOMEPAGE_URL = 'http://www.lsdevices.com/'
export const ROBOTS_URL = 'http://lsdevices.com/robots.txt'
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'http://lsdevices.com/career',
  'http://lsdevices.com/careers',
  'http://lsdevices.com/careers/',
  'http://lsdevices.com/jobs',
  'http://lsdevices.com/openings',
  'http://lsdevices.com/current-openings',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bcareer opportunities\b/i,
  /\bjoin our team\b/i,
  /\bapply now\b/i,
  /\bapply here\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bwe(?:'|&#8217;|&#x2019;|&rsquo;)?re hiring\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&mdash;|&#8212;|&#x2014;/gi, '-')
    .replace(/&ndash;|&#8211;|&#x2013;/gi, '-')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

export const hasPublicJobsSignal = (value) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

export const hasVerifiedExpiredWixSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Reconnect Your Domain \| Wix\.com\s*<\/title>/i.test(rawHtml)
    && /<meta[^>]+name=["']description["'][^>]+content=["']This domain used to be connected to a Wix website\./i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.expiredwixdomain\.com\/["']/i.test(rawHtml)
    && /<meta[^>]+name=["']robots["'][^>]+content=["']noindex["']/i.test(rawHtml)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']Domain Expired Page["']/i.test(rawHtml)
    && normalized.includes('dreaming of your own domain? claim one now on wix.')
    && normalized.includes('need to extend your registration.')
    && normalized.includes('get a domain')
  }

export const createLSDevicesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (hasPublicJobsSignal(homepageHtml)) {
      throw new Error('LS Devices (P) Ltd homepage now appears to expose public jobs')
    }
    if (!hasVerifiedExpiredWixSignal(homepageHtml)) {
      throw new Error('LS Devices (P) Ltd homepage no longer matches the verified expired-domain surface')
    }

    const wwwHomepageHtml = await fetchText(WWW_HOMEPAGE_URL)
    if (hasPublicJobsSignal(wwwHomepageHtml)) {
      throw new Error('LS Devices (P) Ltd www homepage now appears to expose public jobs')
    }
    if (!hasVerifiedExpiredWixSignal(wwwHomepageHtml)) {
      throw new Error('LS Devices (P) Ltd www homepage no longer matches the verified expired-domain surface')
    }

    const robotsSurface = await fetchText(ROBOTS_URL)
    if (hasPublicJobsSignal(robotsSurface) || !hasVerifiedExpiredWixSignal(robotsSurface)) {
      throw new Error('LS Devices (P) Ltd robots surface no longer matches the verified expired-domain contract')
    }

    for (const routeUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
      const routeHtml = await fetchText(routeUrl)
      if (hasPublicJobsSignal(routeHtml) || !hasVerifiedExpiredWixSignal(routeHtml)) {
        throw new Error(`LS Devices (P) Ltd verified no-public-careers route changed: ${routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createLSDevicesScraper().run(options)

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
