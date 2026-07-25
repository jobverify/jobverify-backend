import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sequellogistics'
export const COMPANY = 'Sequel Logistics'
export const HOMEPAGE_URL = 'https://sequelglobal.com/'
export const ABOUT_URL = 'https://sequelglobal.com/about'
export const OFFICE_URL = 'https://sequelglobal.com/sequel-office'
export const CONTACT_URL = 'https://sequelglobal.com/contact'
export const VERIFIED_MISSING_ROUTE_URLS = [
  'https://sequelglobal.com/career',
  'https://sequelglobal.com/careers',
  'https://sequelglobal.com/jobs',
  'https://sequelglobal.com/apply',
  'https://sequel247.com/careers',
  'https://sequel247.com/jobs',
  'https://sequel247.com/apply',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const FIRST_PARTY_CAREER_LINK_PATTERN =
  /href=["'](?:https?:\/\/(?:www\.)?(?:sequelglobal|sequel247)\.com)?\/(?:careers?|jobs?|apply)(?:[/?#][^"']*)?["']/i

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bwe(?:'|&#8217;|&#x2019;|&rsquo;)?re hiring\b/i,
  /\bjoin our team\b/i,
  /\bopen positions?\b/i,
  /\bcurrent openings?\b/i,
  /\bjob openings?\b/i,
  /\bapply now\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
  /linkedin\.com\/jobs/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

export const defaultFetchPage = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(timeoutMs),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Sequel Logistics\s*<\/title>/i.test(page)
    && normalized.includes('Sequel Logistics')
    && normalized.includes('Trusted logistics and secure delivery solutions')
    && normalized.includes('Built for high-assurance movement and visibility')
}

export const hasOfficialAboutSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*About Sequel Logistics\s*<\/title>/i.test(page)
    && normalized.includes('About Sequel Logistics')
    && normalized.includes('Our Story')
    && normalized.includes('Sequel builds secure logistics systems for enterprise operations.')
    && normalized.includes('Operational excellence across critical delivery networks.')
}

export const hasOfficialOfficeSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Sequel Office\s*<\/title>/i.test(page)
    && normalized.includes('Sequel Office')
    && normalized.includes('Office network and operating hubs')
    && /https:\/\/sequel247\.com\/login/i.test(page)
    && /https:\/\/sequel247\.com\/register/i.test(page)
}

export const hasOfficialContactSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Contact Sequel Logistics\s*<\/title>/i.test(page)
    && normalized.includes('Contact')
    && normalized.includes('Get in touch with Sequel Logistics')
    && normalized.includes('Customer support and business enquiries')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasFirstPartyCareerLikeLink = (html) =>
  FIRST_PARTY_CAREER_LINK_PATTERN.test(String(html ?? ''))

export const isVerifiedMissingCareerRoute = (page = {}) => {
  const html = String(page?.html ?? '')
  const normalized = normalizeWhitespace(html).toLowerCase()

  return Number(page?.status) === 404
    && /<title>\s*Not Found\s*<\/title>/i.test(html)
    && normalized.includes('404')
    && normalized.includes('not found')
    && !hasPublicJobsSignal(html)
    && !hasFirstPartyCareerLikeLink(html)
  }

export const createSequelLogisticsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Sequel Logistics verified official homepage no longer matches the known public surface')
    }
    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Sequel Logistics homepage now appears to expose a public jobs surface')
    }
    if (hasFirstPartyCareerLikeLink(homepage.html)) {
      throw new Error('Sequel Logistics homepage now exposes a first-party careers path')
    }

    const about = await fetchPage(ABOUT_URL)
    if (about.status !== 200 || !hasOfficialAboutSignal(about.html)) {
      throw new Error('Sequel Logistics verified about page no longer matches the known public surface')
    }
    if (hasPublicJobsSignal(about.html) || hasFirstPartyCareerLikeLink(about.html)) {
      throw new Error('Sequel Logistics about page now appears to expose a public jobs surface')
    }

    const office = await fetchPage(OFFICE_URL)
    if (office.status !== 200 || !hasOfficialOfficeSignal(office.html)) {
      throw new Error('Sequel Logistics verified office page no longer matches the known public surface')
    }
    if (hasPublicJobsSignal(office.html) || hasFirstPartyCareerLikeLink(office.html)) {
      throw new Error('Sequel Logistics office page now appears to expose a public jobs surface')
    }

    const contact = await fetchPage(CONTACT_URL)
    if (contact.status !== 200 || !hasOfficialContactSignal(contact.html)) {
      throw new Error('Sequel Logistics verified contact page no longer matches the known public surface')
    }
    if (hasPublicJobsSignal(contact.html) || hasFirstPartyCareerLikeLink(contact.html)) {
      throw new Error('Sequel Logistics contact page now appears to expose a public jobs surface')
    }

    for (const routeUrl of VERIFIED_MISSING_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isVerifiedMissingCareerRoute(routePage)) {
        throw new Error(`Sequel Logistics verified no-public-careers route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createSequelLogisticsScraper().run(options)

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
