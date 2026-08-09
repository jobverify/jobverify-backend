import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { AVALON_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AVALON_TECHNOLOGIES_CATALOG.source
export const COMPANY = AVALON_TECHNOLOGIES_CATALOG.companyName
export const HOMEPAGE_URL = AVALON_TECHNOLOGIES_CATALOG.homepageUrl
export const CAREERS_URL = AVALON_TECHNOLOGIES_CATALOG.companyCareerPage
export const CAREER_ALIAS_URL = AVALON_TECHNOLOGIES_CATALOG.careerAliasUrl
export const ROBOTS_TXT_URL = AVALON_TECHNOLOGIES_CATALOG.robotsTxtUrl
export const SITEMAP_URL = AVALON_TECHNOLOGIES_CATALOG.sitemapUrl
export const VERIFIED_ON = AVALON_TECHNOLOGIES_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = AVALON_TECHNOLOGIES_CATALOG.verifiedSurfaceSummary
export const BROKEN_JOB_ROUTE_URLS = [
  'https://www.avalontec.com/jobs/',
  'https://www.avalontec.com/openings/',
  'https://www.avalontec.com/current-openings/',
  'https://www.avalontec.com/job1/',
  'https://www.avalontec.com/job2/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bcareer opportunities\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /oraclecloud/i,
  /darwinbox/i,
  /icims/i,
  /taleo/i,
  /peoplestrong/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'manual',
  })

  return {
    status: response.status,
    url: response.url,
    location: response.headers.get('location'),
    html: await response.text(),
  }
}

export const hasPublicJobListingSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Electronic Manufacturing Services India \| EMS Solutions\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.avalontec\.com\/["']/i.test(rawHtml)
    && /href=["']https:\/\/www\.avalontec\.com\/careers\/["']/i.test(rawHtml)
    && /Trusted By/i.test(normalized)
    && /Vertical Industry Leaders/i.test(normalized)
    && /Electronic Manufacturing Services India/i.test(normalized)
}

export const hasResumeOnlyCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Careers for experts passionate about building a better world \| Avalon - Avalon Technologies Limited\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.avalontec\.com\/careers\/["']/i.test(rawHtml)
    && /Post your Resume/i.test(normalized)
    && /Select Avalon Location/i.test(normalized)
    && /Chennai/i.test(normalized)
    && /Bangalore/i.test(normalized)
    && /Atlanta/i.test(normalized)
    && /Fremont/i.test(normalized)
    && /Select Experience/i.test(normalized)
    && /Allowed file formats : pdf, doc, docx/i.test(normalized)
}

export const hasExpectedRobotsTxtSignal = (text) => {
  const normalized = String(text ?? '')

  return /User-agent:\s*\*/i.test(normalized)
    && /Disallow:\s*\/careers\.php/i.test(normalized)
    && /Disallow:\s*\/job1/i.test(normalized)
    && /Disallow:\s*\/job2/i.test(normalized)
    && /Disallow:\s*\/job3/i.test(normalized)
    && /Disallow:\s*\/job4/i.test(normalized)
    && /Sitemap:\s*https:\/\/www\.avalontec\.com\/sitemap\.xml/i.test(normalized)
}

export const extractSitemapUrls = (xml) =>
  [...String(xml ?? '').matchAll(/<loc>(.*?)<\/loc>/gi)].map((match) => match[1])

export const hasExpectedSitemapSignal = (xml) => {
  const urls = extractSitemapUrls(xml)
  const hasKnownUrls = [
    'https://www.avalontec.com/',
    'https://www.avalontec.com/careers/',
  ].every((url) => urls.includes(url))
  const hasUnexpectedJobUrls = urls.some((url) =>
    /\/(?:career|jobs?|openings|current-openings|job1|job2)\/?$/i.test(url)
    && url !== 'https://www.avalontec.com/careers/')

  return hasKnownUrls && !hasUnexpectedJobUrls
}

export const isKnownCareerAliasRedirect = (page = {}) =>
  Number(page.status) === 301
  && page.location === CAREERS_URL
  && !hasPublicJobListingSignal(page.html)

export const isKnownBrokenJobRoute = (page = {}, requestedUrl) => {
  const expectedLocation = `https://www.www.avalontec.com${new URL(requestedUrl).pathname}`

  return Number(page.status) === 302
    && page.location === expectedLocation
    && !hasPublicJobListingSignal(page.html)
}

export const createAvalonTechnologiesScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Avalon Technologies verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (hasPublicJobListingSignal(careersPage.html)) {
      throw new Error('Avalon Technologies careers page now appears to expose a public jobs board')
    }

    if (careersPage.status !== 200 || !hasResumeOnlyCareersSignal(careersPage.html)) {
      throw new Error('Avalon Technologies verified careers page no longer matches the known public surface')
    }

    const robotsTxt = await fetchPage(ROBOTS_TXT_URL)
    if (robotsTxt.status !== 200 || !hasExpectedRobotsTxtSignal(robotsTxt.html)) {
      throw new Error('Avalon Technologies verified robots.txt no longer matches the known public surface')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (sitemap.status !== 200 || !hasExpectedSitemapSignal(sitemap.html)) {
      throw new Error('Avalon Technologies verified sitemap no longer matches the known public surface')
    }

    const careerAlias = await fetchPage(CAREER_ALIAS_URL)
    if (!isKnownCareerAliasRedirect(careerAlias)) {
      throw new Error('Avalon Technologies verified career alias route changed')
    }

    for (const routeUrl of BROKEN_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isKnownBrokenJobRoute(routePage, routeUrl)) {
        throw new Error(`Avalon Technologies verified no-public-job route changed: ${routePage.location || routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAvalonTechnologiesScraper().run(options)

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
