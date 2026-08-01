import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'talentiseglobal'
export const COMPANY = 'TALENTISE GLOBAL'
export const HOMEPAGE_URL = 'https://talentiseglobal.com/'
export const CANDIDATE_PORTAL_URL = 'https://talentiseglobal.com/content/mobile_login_view'
export const CANDIDATE_LOGIN_URL = 'https://talentiseglobal.com/student/login'
export const CANDIDATE_SIGNUP_URL = 'https://talentiseglobal.com/student'
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'https://talentiseglobal.com/careers',
  'https://talentiseglobal.com/careers/',
  'https://talentiseglobal.com/career',
  'https://talentiseglobal.com/career/',
  'https://talentiseglobal.com/jobs',
  'https://talentiseglobal.com/jobs/',
  'https://talentiseglobal.com/openings',
  'https://talentiseglobal.com/openings/',
  'https://talentiseglobal.com/current-openings',
  'https://talentiseglobal.com/current-openings/',
  'https://talentiseglobal.com/join-us',
  'https://talentiseglobal.com/join-us/',
]

const OFFICIAL_TITLE = 'Talentise Global Pvt. Ltd'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_SIGNALS = [
  'Connecting Talents',
  'With Opportunities',
  'Welcome to Talentise Global Pvt. Ltd',
  'We are a young and creative company and we offer you fresh HR ideas.',
  'End to End Campus Recruitment Support',
  'Customized Talent Acquisition',
  'Proctored Examination Service',
  'Training & Development',
  'Services We Provide',
  'Corporates',
  'Institutes',
  'Students',
]

const CANDIDATE_PORTAL_SIGNALS = [
  'Are you Looking for a Job?',
  'You can register or Login on Talentise Global Pvt. Ltd to start your job search.',
  'Jobseeker Login',
  'I am an Employer',
  'I am an Institute',
]

const CANDIDATE_LOGIN_SIGNALS = [
  'Candidate Login',
  'Login to continue to our application',
]

const CANDIDATE_SIGNUP_SIGNALS = [
  'Sign Up As Candidate',
  'Appeared class 12 ?',
  'Are you a Corporate',
  'Are you an Institute',
]

const MISSING_ROUTE_SIGNALS = [
  'Error 404',
  'Oops! Page not found.',
  'Quick Links',
  'Services',
  'FAQ',
  'Important Links',
]

const PUBLIC_JOB_LISTINGS_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bopen roles\b/i,
  /\bjob openings\b/i,
  /\bjob listings?\b/i,
  /\bsearch jobs\b/i,
  /\bview jobs\b/i,
  /\bavailable positions\b/i,
  /\bcareer opportunities\b/i,
  /\bemployment opportunities\b/i,
  /\brequisition id\b/i,
  /\bjob id\b/i,
  /\bjob category\b/i,
  /\bjob location\b/i,
  /\bapply now\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /workable/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
  /freshteam/i,
  /zohorecruit/i,
]

const EXTERNAL_ATS_LINK_PATTERN =
  /(lever|greenhouse|ashbyhq|workable|myworkdayjobs|workdayjobs|smartrecruiters|jobvite|breezy\.hr|freshteam|zohorecruit)/i

const FIRST_PARTY_CAREER_PATH_PATTERN =
  /^\/(?:careers?|jobs?|job|openings?|current-openings|join-us)(?:\/|$)/i

const BASIC_ENTITY_MAP = new Map([
  ['&nbsp;', ' '],
  ['&amp;', '&'],
  ['&#39;', "'"],
  ['&apos;', "'"],
  ['&rsquo;', "'"],
  ['&#8217;', "'"],
  ['&#x2019;', "'"],
  ['&quot;', '"'],
])

const decodeBasicEntities = (value) => {
  let result = String(value ?? '')

  for (const [entity, replacement] of BASIC_ENTITY_MAP.entries()) {
    result = result.replace(new RegExp(entity, 'gi'), replacement)
  }

  return result
}

const normalizeWhitespace = (value) => decodeBasicEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripHtmlToText = (html) => normalizeWhitespace(
  String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractTitle = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')

const getAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractAnchorUrls = (html, baseUrl) =>
  [...String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["']/gi)]
    .map((match) => getAbsoluteUrl(match[1], baseUrl))
    .filter(Boolean)

const hasAllSignals = (html, signals) => {
  const normalizedText = stripHtmlToText(html).toLowerCase()
  return signals.every((signal) => normalizedText.includes(normalizeWhitespace(signal).toLowerCase()))
}

const hasRequiredLinks = (html, baseUrl, requiredUrls) => {
  const anchorUrls = extractAnchorUrls(html, baseUrl)
  return requiredUrls.every((requiredUrl) => anchorUrls.includes(requiredUrl))
}

const isSameOrigin = (value, baseUrl) => {
  try {
    return new URL(value).origin === new URL(baseUrl).origin
  } catch {
    return false
  }
}

export const hasUnexpectedCareerOrAtsLink = (html, baseUrl = HOMEPAGE_URL) =>
  extractAnchorUrls(html, baseUrl).some((absoluteUrl) => {
    if (!isSameOrigin(absoluteUrl, baseUrl)) {
      return EXTERNAL_ATS_LINK_PATTERN.test(absoluteUrl)
    }

    try {
      return FIRST_PARTY_CAREER_PATH_PATTERN.test(new URL(absoluteUrl).pathname)
    } catch {
      return false
    }
  })

export const hasPublicJobListingsSignal = (html) =>
  PUBLIC_JOB_LISTINGS_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialHomepageSignal = (html) =>
  extractTitle(html) === OFFICIAL_TITLE
  && hasAllSignals(html, HOMEPAGE_SIGNALS)
  && hasRequiredLinks(html, HOMEPAGE_URL, [
    CANDIDATE_PORTAL_URL,
    CANDIDATE_LOGIN_URL,
    CANDIDATE_SIGNUP_URL,
  ])

export const hasCandidatePortalSignal = (html) =>
  extractTitle(html) === OFFICIAL_TITLE
  && hasAllSignals(html, CANDIDATE_PORTAL_SIGNALS)
  && hasRequiredLinks(html, HOMEPAGE_URL, [
    CANDIDATE_LOGIN_URL,
    CANDIDATE_SIGNUP_URL,
  ])

export const hasCandidateLoginSignal = (html) =>
  extractTitle(html) === OFFICIAL_TITLE
  && hasAllSignals(html, CANDIDATE_LOGIN_SIGNALS)
  && /<form[^>]+action=["'](?:https?:\/\/talentiseglobal\.com)?\/student\/login["']/i.test(String(html ?? ''))
  && hasRequiredLinks(html, HOMEPAGE_URL, [CANDIDATE_SIGNUP_URL])

export const hasCandidateSignupSignal = (html) =>
  extractTitle(html) === OFFICIAL_TITLE
  && hasAllSignals(html, CANDIDATE_SIGNUP_SIGNALS)
  && hasRequiredLinks(html, HOMEPAGE_URL, [CANDIDATE_LOGIN_URL])

export const isVerifiedMissingCareersRoute = (page = {}) =>
  Number(page?.status) === 200
  && extractTitle(page?.html) === OFFICIAL_TITLE
  && hasAllSignals(page?.html, MISSING_ROUTE_SIGNALS)
  && hasRequiredLinks(page?.html, HOMEPAGE_URL, [
    CANDIDATE_PORTAL_URL,
    CANDIDATE_LOGIN_URL,
    CANDIDATE_SIGNUP_URL,
  ])
  && !hasPublicJobListingsSignal(page?.html)
  && !hasUnexpectedCareerOrAtsLink(page?.html, HOMEPAGE_URL)

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

const verifyNoPublicListings = (html, pageLabel) => {
  if (hasPublicJobListingsSignal(html) || hasUnexpectedCareerOrAtsLink(html, HOMEPAGE_URL)) {
    throw new Error(`Talentise Global ${pageLabel} now appears to expose public job listings`)
  }
}

export const createTalentiseGlobalScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Talentise Global verified official homepage no longer matches the known public surface')
    }
    verifyNoPublicListings(homepage.html, 'homepage')

    const candidatePortal = await fetchPage(CANDIDATE_PORTAL_URL)
    if (candidatePortal.status !== 200 || !hasCandidatePortalSignal(candidatePortal.html)) {
      throw new Error('Talentise Global verified candidate portal no longer matches the known first-party jobseeker surface')
    }
    verifyNoPublicListings(candidatePortal.html, 'candidate portal')

    const candidateLogin = await fetchPage(CANDIDATE_LOGIN_URL)
    if (candidateLogin.status !== 200 || !hasCandidateLoginSignal(candidateLogin.html)) {
      throw new Error('Talentise Global verified candidate login page no longer matches the known first-party surface')
    }
    verifyNoPublicListings(candidateLogin.html, 'candidate login page')

    const candidateSignup = await fetchPage(CANDIDATE_SIGNUP_URL)
    if (candidateSignup.status !== 200 || !hasCandidateSignupSignal(candidateSignup.html)) {
      throw new Error('Talentise Global verified candidate sign-up page no longer matches the known first-party surface')
    }
    verifyNoPublicListings(candidateSignup.html, 'candidate sign-up page')

    for (const routeUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedMissingCareersRoute(routePage)) {
        throw new Error(
          `Talentise Global verified no-public-careers route changed materially or now exposes public job listings: ${routePage.url || routeUrl}`,
        )
      }
    }

    return []
  },
})

export const run = async (options = {}) => createTalentiseGlobalScraper().run(options)

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
