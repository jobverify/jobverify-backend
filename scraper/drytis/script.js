import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'drytis'
export const COMPANY = 'DRYTIS'
export const HOMEPAGE_URL = 'https://drytis.com/'
export const ABOUT_URL = 'https://drytis.com/about'
export const PRIVACY_URL = 'https://drytis.com/privacy'
export const TERMS_URL = 'https://drytis.com/terms'
export const ENGINEERS_URL = 'https://drytis.com/engineers'
export const SITEMAP_URL = 'https://drytis.com/sitemap.xml'
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'https://drytis.com/careers',
  'https://drytis.com/career',
  'https://drytis.com/jobs',
  'https://drytis.com/job',
  'https://drytis.com/join-us',
  'https://drytis.com/work-with-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bjobposting\b/i,
  /\bcurrent openings?\b/i,
  /\bopen positions?\b/i,
  /\bopen roles?\b/i,
  /\bjob openings?\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /\bapply for (?:this|the) (?:role|position)\b/i,
  /\bjob description\b/i,
  /\bposition summary\b/i,
  /\bjoin our team\b/i,
  /\bsubmit your application\b/i,
  /mailto:[^"' >]*(careers?|jobs?|recruit|recruiting|talent|hr)[^"' >]*/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
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
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return /<title>\s*Drytis\s*[\u2014-]\s*AI builds prototypes\.\s*Humans build companies\.\s*<\/title>/i.test(page)
    && normalized.includes('ai democratized starting. drytis democratizes finishing.')
    && normalized.includes('we built the door.')
    && /©\s*2026\s*Drytis\.\s*All rights reserved\./i.test(page)
}

export const hasOfficialAboutSignal = (html) => {
  const page = String(html ?? '')
  const raw = page.toLowerCase()
  const normalized = normalizeWhitespace(page).toLowerCase()

  return /<title>\s*Drytis\s*[\u2014-]\s*About\s*<\/title>/i.test(page)
    && raw.includes('drytis exists so finishing is just as accessible as starting.')
    && normalized.includes('we built drytis for that exact moment.')
    && normalized.includes("you're probably at the wrong company.")
}

export const pageHasExpectedEngineersLink = (html) =>
  /<a\b[^>]*href=["'](?:https?:\/\/drytis\.com)?\/engineers["'][^>]*>/i.test(String(html ?? ''))

export const hasOfficialPrivacySignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return /<title>\s*Privacy\s*\|\s*Drytis\s*-\s*AI App Builder\s*<\/title>/i.test(page)
    && normalized.includes('how drytis collects, uses, and protects your personal information.')
    && normalized.includes('drytis, inc.')
    && normalized.includes('job applicants and recruiting candidates')
    && pageHasExpectedEngineersLink(page)
}

export const hasOfficialTermsSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return /<title>\s*Terms\s*\|\s*Drytis\s*-\s*AI App Builder\s*<\/title>/i.test(page)
    && normalized.includes('the terms, policies, and agreements that govern your use of the drytis platform.')
    && normalized.includes('drytis charges on a pay-per-use basis.')
    && normalized.includes('support@drytis.com')
    && normalized.includes('state of delaware, united states')
    && pageHasExpectedEngineersLink(page)
}

export const hasOfficialEngineersSignal = (html) => {
  const page = String(html ?? '')
  const raw = page.toLowerCase()
  const normalized = normalizeWhitespace(page).toLowerCase()

  return /<title>\s*Our Engineers\s*\|\s*Drytis\s*<\/title>/i.test(page)
    && raw.includes('meet the vetted senior engineers behind drytis lifeguard.')
    && normalized.includes('not a directory. not a marketplace.')
    && normalized.includes('1 in 12')
    && normalized.includes('applicants make it through.')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const sitemapHasUnexpectedCareerLikeUrl = (xml) => {
  const matches = Array.from(
    String(xml ?? '').matchAll(/<loc>([^<]+)<\/loc>/gi),
    (match) => match[1],
  )

  return matches.some((entry) => /\/(?:careers?|jobs?|join-us|work-with-us)(?:\/|$|[?#])/i.test(entry))
}

export const isVerifiedMissingCareerRoute = (page = {}) => {
  const normalized = normalizeWhitespace(page?.html).toLowerCase()

  return Number(page?.status) === 404
    && normalized.includes('error response')
    && normalized.includes('error code: 404')
    && normalized.includes('message: file not found.')
    && normalized.includes('nothing matches the given uri.')
    && !hasPublicJobsSignal(page?.html)
}

export const createDrytisScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('DRYTIS verified homepage no longer matches the known first-party surface')
    }
    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('DRYTIS homepage now appears to expose a public jobs surface')
    }

    const about = await fetchPage(ABOUT_URL)
    if (about.status !== 200 || !hasOfficialAboutSignal(about.html)) {
      throw new Error('DRYTIS verified about page no longer matches the known first-party surface')
    }
    if (hasPublicJobsSignal(about.html)) {
      throw new Error('DRYTIS about page now appears to expose a public jobs surface')
    }

    const privacy = await fetchPage(PRIVACY_URL)
    if (privacy.status !== 200 || !hasOfficialPrivacySignal(privacy.html)) {
      throw new Error('DRYTIS verified privacy page no longer matches the known first-party surface')
    }
    if (hasPublicJobsSignal(privacy.html)) {
      throw new Error('DRYTIS privacy page now appears to expose a public jobs surface')
    }

    const terms = await fetchPage(TERMS_URL)
    if (terms.status !== 200 || !hasOfficialTermsSignal(terms.html)) {
      throw new Error('DRYTIS verified terms page no longer matches the known first-party surface')
    }
    if (hasPublicJobsSignal(terms.html)) {
      throw new Error('DRYTIS terms page now appears to expose a public jobs surface')
    }

    const engineers = await fetchPage(ENGINEERS_URL)
    if (engineers.status !== 200 || !hasOfficialEngineersSignal(engineers.html)) {
      throw new Error('DRYTIS verified engineers page no longer matches the known first-party surface')
    }
    if (hasPublicJobsSignal(engineers.html)) {
      throw new Error('DRYTIS engineers page now appears to expose a public jobs surface')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (sitemap.status !== 200 || sitemapHasUnexpectedCareerLikeUrl(sitemap.html)) {
      throw new Error('DRYTIS verified sitemap no longer matches the known careers-free surface')
    }

    for (const routeUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isVerifiedMissingCareerRoute(routePage)) {
        throw new Error(`DRYTIS verified no-public-careers route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createDrytisScraper().run(options)

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
