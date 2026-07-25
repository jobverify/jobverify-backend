import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'loyalwingmantechnologies'
export const COMPANY = 'Loyal Wingman Technologies'
export const VERIFIED_AT = '2026-07-13'
export const HOMEPAGE_URL = 'https://loyalwingman.ai/'
export const WWW_HOMEPAGE_URL = 'https://www.loyalwingman.ai/'
export const ROBOTS_URL = 'https://loyalwingman.ai/robots.txt'
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'https://loyalwingman.ai/careers',
  'https://loyalwingman.ai/jobs',
  'https://loyalwingman.ai/join-us',
  'https://loyalwingman.ai/openings',
  'https://loyalwingman.ai/current-openings',
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
  /\bwe(?:'|&#8217;|&#x2019;|&rsquo;)?re hiring\b/i,
  /\bvacanc(?:y|ies)\b/i,
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
    .replace(/&amp;/gi, '&')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&rsquo;|&#8217;|&#x2019;/gi, "'")
    .replace(/[\u2018\u2019]/g, "'")
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

export const hasVerifiedComingSoonSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Coming Soon\s*<\/title>/i.test(rawHtml)
    && /<meta[^>]+name=["']robots["'][^>]+content=["']noindex["']/i.test(rawHtml)
    && normalized.includes('loyalwingman.ai')
    && normalized.includes("we're under construction.")
    && normalized.includes('please check back for an update soon.')
    && rawHtml.includes('parking-page-32145bd77d42b5ff-min.en-US.css')
    && rawHtml.includes('assets.squarespace.com')
}

export const hasVerifiedPrivateSiteSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const hasPrivateMessage =
    /This site is currently private\.\s*If you(?:'|’|â€™)?re the owner or contributor,\s*(?:<a href="\/config">log in<\/a>|log in)\.?/i.test(rawHtml)
    || normalized.includes("this site is currently private. if you're the owner or contributor, log in.")

  return /<title>\s*Private Site\s*<\/title>/i.test(rawHtml)
    && /<meta[^>]+name=["']robots["'][^>]+content=["']noindex["']/i.test(rawHtml)
    && normalized.includes('private site')
    && hasPrivateMessage
    && rawHtml.includes('squarespace-system-page')
}

export const createLoyalWingmanTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (hasPublicJobsSignal(homepageHtml)) {
      throw new Error('Loyal Wingman Technologies homepage now appears to expose public jobs')
    }
    if (!hasVerifiedComingSoonSignal(homepageHtml)) {
      throw new Error('Loyal Wingman Technologies homepage no longer matches the verified placeholder surface')
    }

    const wwwHomepageHtml = await fetchText(WWW_HOMEPAGE_URL)
    if (hasPublicJobsSignal(wwwHomepageHtml)) {
      throw new Error('Loyal Wingman Technologies www homepage now appears to expose public jobs')
    }
    if (!hasVerifiedComingSoonSignal(wwwHomepageHtml)) {
      throw new Error('Loyal Wingman Technologies www homepage no longer matches the verified placeholder surface')
    }

    const robotsHtml = await fetchText(ROBOTS_URL)
    if (!hasVerifiedPrivateSiteSignal(robotsHtml)) {
      throw new Error('Loyal Wingman Technologies robots.txt no longer matches the verified placeholder surface')
    }

    for (const routeUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
      const routeHtml = await fetchText(routeUrl)
      if (hasPublicJobsSignal(routeHtml) || !hasVerifiedComingSoonSignal(routeHtml)) {
        throw new Error(`Loyal Wingman Technologies verified no-public-careers route changed: ${routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createLoyalWingmanTechnologiesScraper().run(options)

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
