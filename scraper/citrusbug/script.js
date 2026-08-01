import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'citrusbug'
export const COMPANY = 'CitrusBug'
export const VERIFIED_ON = '2026-07-25'
export const CAREERS_URL = 'https://citrusbug.com/career/'
export const DISPOSITION =
  'verified-first-party-careers-page-plus-public-same-page-application-form'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://citrusbug.com/career/ was the live exact-company CitrusBug careers surface, that it publicly listed Ahmedabad onsite openings for Digital Marketing (Sr level), Executive Assistant (EA) to CEO, and Sales Head - IT Services, and that applicants were handled through the first-party on-page Apply for Job form plus the jobs@citrusbug.co contact channel. This scraper validates that verified same-page public contract and returns the public Ahmedabad roles from the official careers page.'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const CAREERS_PAGE_PATTERNS = [
  /\bJoin Our Team\b/i,
  /\bAt Citrusbug Technolabs, the world\S*s most talented engineers, designers, and thought leaders are shaping the future of online publishing\./i,
  /\bLife @ Citrusbug Technolabs\b/i,
  /\bOpen Positions\b/i,
  /Shape Your Career With Us!?/i,
  /\bEmail\s+jobs@citrusbug\.co\b/i,
]

const APPLICATION_FORM_PATTERNS = [
  /\bApply for Job\b/i,
  /\bPosition Applying For\b/i,
  /\bUpload Resume\b/i,
  /\bWilling to relocate to Ahmedabad\b/i,
]

const ROLE_HEADER_PATTERN =
  /(?<title>[A-Za-z0-9][A-Za-z0-9()[\]/,&+.' -]*?)\s+Ahmedabad\s*\|\s*Onsite\s*\|\s*(?<experience>[A-Za-z0-9+.\- ]*Years?)\s+View Details/gi

const ATS_HOST_PATTERNS = [
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /jobs\.ashbyhq\.com/i,
  /ashbyhq\.com/i,
  /myworkdayjobs\.com/i,
  /workdayjobs\.com/i,
  /smartrecruiters\.com/i,
  /jobvite\.com/i,
  /workable\.com/i,
  /bamboohr\.com/i,
  /applytojob\.com/i,
  /recruitee\.com/i,
  /zohorecruit\.in/i,
  /darwinbox/i,
  /kekahire\.com/i,
  /freshteam\.com/i,
  /teamtailor\.com/i,
]

const PUBLIC_COMPANY_JOBS_PATTERNS = [
  /^https?:\/\/(?:[\w-]+\.)?linkedin\.com\/company\/[^/?#]+\/jobs(?:\/|[?#]|$)/i,
  /^https?:\/\/(?:[\w-]+\.)?linkedin\.com\/jobs\/search\/?(?:[?#].*)?$/i,
  /^https?:\/\/wellfound\.com\/company\/[^/?#]+\/jobs(?:\/|[?#]|$)/i,
  /^https?:\/\/angel\.co\/company\/[^/?#]+\/jobs(?:\/|[?#]|$)/i,
  /^https?:\/\/cutshort\.io\/company\/[^/?#]+(?:\/jobs)?(?:[?#]|$)/i,
]

const SAME_ORIGIN_JOB_PATH_PATTERNS = [
  /^\/career\/[^?#]+/i,
  /^\/careers?(?:\/|$)/i,
  /^\/jobs?(?:\/|$)/i,
  /^\/positions?(?:\/|$)/i,
  /^\/roles?(?:\/|$)/i,
  /^\/openings?(?:\/|$)/i,
  /^\/apply(?:\/|$)/i,
  /^\/join-us(?:\/|$)/i,
]

const decodeEntities = (value = '') =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&bull;/gi, '|')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\u2022/g, ' | ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/([0-9])Years\b/gi, '$1 Years')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value = '') =>
  normalizeWhitespace(
    decodeEntities(String(value))
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/main|\/form|\/select|\/option|\/ul|\/ol)\b[^>]*>/gi, '\n')
      .replace(/<(p|div|li|h[1-6]|section|article|main|form|select|option|ul|ol)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const normalizePageText = (value = '') =>
  decodeEntities(String(value))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/main|\/form|\/select|\/option|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|h[1-6]|section|article|main|form|select|option|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u2022/g, ' | ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/([0-9])Years\b/gi, '$1 Years')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .join('\n')

const slugify = (value = '') =>
  normalizeWhitespace(value)
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || null

const normalizeExperience = (value = '') =>
  normalizeWhitespace(value)
    ?.replace(/\s*-\s*/g, '-')
    .replace(/\s*\+\s*/g, '+ ')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2') || null

const getOpenPositionsSection = (html = '') => {
  const text = normalizePageText(html)
  const match = text.match(/\bOpen Positions\b([\s\S]*?)Shape Your Career With Us!?/i)
  return normalizeWhitespace(match?.[1] || '') ? match[1].trim() : null
}

const extractSectionText = (block = '', startLabel, endLabel) => {
  const pattern = new RegExp(
    `${startLabel}\\s+([\\s\\S]*?)\\s+${endLabel}`,
    'i',
  )
  const value = block.match(pattern)?.[1]
  return stripTags(value || '') || null
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const text = normalizePageText(html)
  return CAREERS_PAGE_PATTERNS.every((pattern) => pattern.test(text))
}

export const hasApplicationFormSignal = (html = '') => {
  const text = normalizePageText(html)
  return APPLICATION_FORM_PATTERNS.every((pattern) => pattern.test(text))
}

export const extractRoleCards = (html = '') => {
  const section = getOpenPositionsSection(html)
  if (!section) return []

  const matches = [...section.matchAll(ROLE_HEADER_PATTERN)]
  if (matches.length === 0) return []

  return matches
    .map((match, index) => {
      const nextMatch = matches[index + 1]
      const block = section.slice(match.index, nextMatch?.index ?? section.length)
      const title = normalizeWhitespace(match.groups?.title)
      const experienceRequired = normalizeExperience(match.groups?.experience)
      const jobDescription = extractSectionText(block, 'Job Description', 'Opportunity')
      const minimumQualification =
        stripTags(block.match(/Qualifications\s+([\s\S]*)/i)?.[1] || '') || null

      if (!title || !experienceRequired || !jobDescription) return null

      return {
        title,
        experienceRequired,
        jobDescription,
        minimumQualification,
      }
    })
    .filter(Boolean)
}

export const assertNoUnexpectedPublicJobsSurface = (html = '', careersUrl = CAREERS_URL) => {
  const linkedUrls = [...String(html).matchAll(
    /(?:href|src|action|data-url)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  )]
    .map((match) => match[1] || match[2] || match[3] || '')
    .map((rawValue) => {
      try {
        return new URL(decodeEntities(rawValue), careersUrl)
      } catch {
        return null
      }
    })
    .filter(Boolean)

  const careersPage = new URL(careersUrl)
  const careersPath = careersPage.pathname.replace(/\/+$/, '') || '/'

  const atsBoardUrl = linkedUrls.find((url) =>
    ATS_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname)),
  )
  if (atsBoardUrl) {
    throw new Error(
      `CitrusBug public careers surface now exposes a different public jobs surface via ${atsBoardUrl.toString()}.`,
    )
  }

  const publicCompanyJobsUrl = linkedUrls.find((url) =>
    PUBLIC_COMPANY_JOBS_PATTERNS.some((pattern) => pattern.test(url.toString())),
  )
  if (publicCompanyJobsUrl) {
    throw new Error(
      `CitrusBug public careers surface now exposes a different public jobs surface via ${publicCompanyJobsUrl.toString()}.`,
    )
  }

  const sameOriginJobUrl = linkedUrls.find((url) => {
    if (url.origin !== careersPage.origin) return false

    const pathname = url.pathname.replace(/\/+$/, '') || '/'
    if (pathname === careersPath) return false

    return SAME_ORIGIN_JOB_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
  })
  if (sameOriginJobUrl) {
    throw new Error(
      `CitrusBug public careers surface now exposes a different public jobs surface via ${sameOriginJobUrl.toString()}.`,
    )
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const mapRoleToJob = (role, scrapedAt) => {
  const jobId = slugify(role.title)
  if (!jobId) return null

  return {
    title: role.title,
    company: COMPANY,
    department: null,
    location: 'Ahmedabad, India',
    city: 'Ahmedabad',
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: CAREERS_URL,
    applyUrl: CAREERS_URL,
    employmentType: null,
    experienceRequired: role.experienceRequired,
    minimumQualification: role.minimumQualification,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: role.jobDescription,
    source: SOURCE,
    link: CAREERS_URL,
    scrapedAt,
  }
}

export const createCitrusBugScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const html = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersPageSignal(html)) {
      throw new Error('CitrusBug verified official careers page changed materially')
    }

    if (!hasApplicationFormSignal(html)) {
      throw new Error('CitrusBug verified same-page application form changed materially')
    }

    assertNoUnexpectedPublicJobsSurface(html, CAREERS_URL)

    const roles = extractRoleCards(html)
    if (roles.length === 0) {
      throw new Error('CitrusBug careers page no longer exposes the verified public role structure')
    }

    const scrapedAt = now()

    return roles
      .map((role) => mapRoleToJob(role, scrapedAt))
      .filter(Boolean)
  },
})

export const run = async (options = {}) => createCitrusBugScraper().run(options)
