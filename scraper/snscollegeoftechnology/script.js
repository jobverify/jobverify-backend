import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../../scraper-support/utils/retry.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'snscollegeoftechnology'
export const COMPANY = 'SNS College of Technology'
export const HOMEPAGE_URL = 'https://snsct.org/'
export const ROBOTS_URL = 'https://snsct.org/robots.txt'
export const SITEMAP_URL = 'https://snsct.org/sitemap.xml'
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'https://snsct.org/careers',
  'https://snsct.org/careers/',
  'https://snsct.org/career',
  'https://snsct.org/career/',
  'https://snsct.org/jobs',
  'https://snsct.org/jobs/',
  'https://snsct.org/job-openings',
  'https://snsct.org/job-openings/',
  'https://snsct.org/recruitment',
  'https://snsct.org/recruitment/',
  'https://snsct.org/faculty-recruitment',
  'https://snsct.org/faculty-recruitment/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREER_ROUTE_PATTERN = /\/(?:careers?|jobs?|job-openings|recruitment|faculty-recruitment)\/?/i

const PUBLIC_JOB_BOARD_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bjoin our team\b/i,
  /\bwe(?:'|&#8217;|&#x2019;|&rsquo;)?re hiring\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /bamboohr/i,
  /freshteam/i,
  /darwinbox/i,
  /keka\.com/i,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x2019;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const defaultFetchPage = async (url) =>
  withRetry(async () => {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
      },
    })

    return {
      status: response.status,
      url: response.url,
      html: await response.text(),
    }
  }, {
    attempts: 3,
    baseDelayMs: 2000,
    label: SOURCE,
  })

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return /<title>\s*SNS College of Technology \| Autonomous \| NAAC A\+\+ \| AI Engineering \| Coimbatore \| TNEA 2726\s*<\/title>/i.test(rawHtml)
    && normalized.includes('sns college of technology')
    && rawHtml.includes('TNEA Code: 2726')
    && rawHtml.includes('Admissions open 2026')
    && rawHtml.includes('Highest package 53 LPA')
    && rawHtml.includes('snsct@snsgroups.com')
    && rawHtml.includes('Career : job@snsgroups.com')
}

export const hasCareerContactSignal = (html) =>
  /career\s*:\s*job@snsgroups\.com/i.test(String(html ?? ''))

export const hasPublicJobBoardSignal = (html) =>
  PUBLIC_JOB_BOARD_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialRobotsSignal = (text) => {
  const normalized = normalizeWhitespace(text).toLowerCase()

  return normalized.includes('robots.txt')
    && normalized.includes('sns college of technology')
    && normalized.includes('domain : https://snsct.org')
    && normalized.includes('sitemap: https://snsct.org/sitemap.xml')
}

export const hasOfficialSitemapSignal = (xml) => {
  const rawXml = String(xml ?? '')

  return rawXml.includes('<?xml')
    && rawXml.includes('<urlset')
    && rawXml.includes('https://snsct.org/')
}

export const robotsMentionCareerLikeRoute = (text) =>
  CAREER_ROUTE_PATTERN.test(String(text ?? ''))

export const sitemapHasCareerLikeUrl = (xml) => {
  const matches = String(xml ?? '').match(/<loc>([^<]+)<\/loc>/gi) || []
  return matches.some((entry) => CAREER_ROUTE_PATTERN.test(entry))
}

export const isVerifiedNoPublicCareersRoute = (page = {}) =>
  Number(page?.status) === 404
  && hasOfficialHomepageSignal(page?.html)
  && hasCareerContactSignal(page?.html)
  && !hasPublicJobBoardSignal(page?.html)

export const createSnsCollegeOfTechnologyScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('SNS College of Technology verified official homepage no longer matches the known public surface')
    }

    if (!hasCareerContactSignal(homepage.html)) {
      throw new Error('SNS College of Technology homepage no longer exposes the verified first-party career contact')
    }

    if (hasPublicJobBoardSignal(homepage.html)) {
      throw new Error('SNS College of Technology homepage now appears to expose a public jobs surface')
    }

    const robots = await fetchPage(ROBOTS_URL)
    if (
      robots.status !== 200
      || !hasOfficialRobotsSignal(robots.html)
      || robotsMentionCareerLikeRoute(robots.html)
    ) {
      throw new Error('SNS College of Technology verified robots.txt no longer matches the no-public-careers surface')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (
      sitemap.status !== 200
      || !hasOfficialSitemapSignal(sitemap.html)
      || sitemapHasCareerLikeUrl(sitemap.html)
    ) {
      throw new Error('SNS College of Technology verified sitemap no longer matches the no-public-careers surface')
    }

    for (const routeUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedNoPublicCareersRoute(routePage)) {
        throw new Error(`SNS College of Technology verified no-public-careers route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createSnsCollegeOfTechnologyScraper().run(options)

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
