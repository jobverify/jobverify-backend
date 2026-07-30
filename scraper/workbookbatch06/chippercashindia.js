import { fetchTextWithRetry } from '../utils/fetch.js'

export const SOURCE = 'chippercashindia'
export const COMPANY = 'Chipper Cash India'
export const OFFICIAL_BRAND = 'Chipper Cash'
export const VERIFIED_ON = '2026-07-25'
export const CAREERS_URL = 'https://www.chippercash.com/careers'
export const CURRENT_OPENINGS_URL = 'https://www.chippercash.com/career-current-openings'
export const DISPOSITION =
  'verified-first-party-careers-pages-with-stale-same-origin-openings-fail-closed'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.chippercash.com/careers was the live first-party Chipper Cash careers surface, that https://www.chippercash.com/career-current-openings still exposed same-origin opening links, and that the linked public role pages for Growth Analyst, Nigeria; Software Engineer I - Risk & Compliance; Data Engineer, Risk Intelligence; Software Engineer I - Risk Intelligence & Automations; and RISK AND COMPLIANCE OFFICER/ASSOCIATE RWANDA all carried application deadlines that were already in the past on Saturday, July 25, 2026. Because the reviewed first-party openings inventory was stale and all verified public roles were located in Nigeria or Rwanda rather than India, no trustworthy current public jobs contract was verified for Chipper Cash India, so this company-local scraper stays fail-closed and returns no jobs until a stable current openings flow is verified.'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const REQUIRED_CAREERS_PATTERNS = [
  /\bGive the World New Ways to Transact\b/i,
  /\bProvide the most trusted and accessible financial services for people living in Africa and beyond\./i,
  /\bUnlock global opportunities to connect Africa\./i,
  /\bFind Your People\b/i,
  /\bSee Current Openings\b/i,
]

const REQUIRED_OPENINGS_PATTERNS = [
  /\bYour Finest Hours Await\b/i,
  /\bOpenings Available\b/i,
  /\bAll Location Ghana South Africa Zambia Zimbabwe Rwanda Nigeria UK\b/i,
  /\bAll Department Business & Customer Operations Engineering Finance Legal, Risk and Compliance\b/i,
  /\bNo items found\./i,
]

const TRUSTED_JOBS_HOST_PATTERNS = [
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

const LINKEDIN_PUBLIC_JOBS_PATTERNS = [
  /^https?:\/\/(?:[\w-]+\.)?linkedin\.com\/company\/[^/?#]+\/jobs(?:\/|[?#]|$)/i,
  /^https?:\/\/(?:[\w-]+\.)?linkedin\.com\/jobs\/search\/?(?:[?#].*)?$/i,
  /^https?:\/\/(?:[\w-]+\.)?linkedin\.com\/jobs\/view\/[^?#]+(?:[?#].*)?$/i,
]

export const VERIFIED_PUBLIC_JOBS = Object.freeze([
  {
    title: 'Growth Analyst, Nigeria',
    detailUrl: 'https://www.chippercash.com/career/growth-analyst-nigeria',
    department: 'Business & Customer Operations',
    country: 'Nigeria',
    applyBy: '17th November 2025',
    detailPattern: /\bIdentify Growth Opportunities\b/i,
  },
  {
    title: 'Software Engineer I - Risk & Compliance',
    detailUrl: 'https://www.chippercash.com/career/software-engineer-i---risk-compliance',
    department: 'Engineering',
    country: 'Nigeria',
    applyBy: '7th November 2025',
    detailPattern:
      /\bThis is a 3-month provisional contract-based role, with a goal of conversion to a long-term position\b/i,
  },
  {
    title: 'Data Engineer, Risk Intelligence',
    detailUrl: 'https://www.chippercash.com/career/data-engineer--risk-intelligence',
    department: 'Engineering',
    country: 'Nigeria',
    applyBy: '7th November 2025',
    detailPattern:
      /\bBuild, evaluate, and deploy intelligent risk models that replace manual reviews\b/i,
  },
  {
    title: 'Software Engineer I - Risk Intelligence & Automations',
    detailUrl: 'https://www.chippercash.com/career/software-engineer-i-risk-intelligence-automations',
    department: 'Engineering',
    country: 'Nigeria',
    applyBy: '7th November 2025',
    detailPattern:
      /\bThe Risk Intelligence & Automations team sits at the core of Chipper Cash(?:'|’)s mission\b/i,
  },
  {
    title: 'RISK AND COMPLIANCE OFFICER/ASSOCIATE RWANDA',
    detailUrl: 'https://www.chippercash.com/career/risk-and-compliance-officer-associate-rwanda',
    department: 'Legal, Risk and Compliance',
    country: 'Rwanda',
    applyBy: '24th February 2026',
    detailPattern: /\bAML\/CFT\/CPF\b/i,
  },
])

const decodeHtmlEntities = (value = '') =>
  String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&rsquo;|&#8217;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '-')
    .replace(/&mdash;|&#8212;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value = '') =>
  decodeHtmlEntities(String(value))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const stripDescriptionHtml = (value = '') =>
  normalizeWhitespace(
    decodeHtmlEntities(value)
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const toAbsoluteUrl = (value, baseUrl = CURRENT_OPENINGS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractLinkedUrls = (html = '', pageUrl = CAREERS_URL) => {
  const matches = String(html).matchAll(
    /(?:href|src|action|data-url)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  )
  const urls = []

  for (const match of matches) {
    const rawValue = match[1] || match[2] || match[3] || ''
    const absoluteUrl = toAbsoluteUrl(decodeHtmlEntities(rawValue), pageUrl)
    if (absoluteUrl) urls.push(new URL(absoluteUrl))
  }

  return urls
}

const uniqueSorted = (values = []) => [...new Set(values)].sort()
const VERIFIED_ON_CUTOFF_ISO = '2026-07-25T00:00:00.000Z'

const parseHumanDateToIso = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const cleaned = normalized.replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1')
  const parsed = new Date(`${cleaned} UTC`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const buildJobIdFromUrl = (detailUrl) => {
  try {
    const pathname = new URL(detailUrl).pathname.replace(/\/+$/, '')
    return pathname.split('/').filter(Boolean).at(-1) || null
  } catch {
    return null
  }
}

const extractCareerDetailUrls = (html = '', pageUrl = CURRENT_OPENINGS_URL) =>
  uniqueSorted(
    extractLinkedUrls(html, pageUrl)
      .filter((url) => url.origin === new URL(CURRENT_OPENINGS_URL).origin)
      .map((url) => url.toString())
      .filter((url) => /^https:\/\/www\.chippercash\.com\/career\/[^/?#]+$/i.test(url))
      .filter((url) => url !== CURRENT_OPENINGS_URL),
  )

const assertNoUnexpectedExternalJobsSurface = (html = '', pageUrl = CAREERS_URL) => {
  const publicJobsUrl = extractLinkedUrls(html, pageUrl).find((url) => {
    if (TRUSTED_JOBS_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) return true
    return LINKEDIN_PUBLIC_JOBS_PATTERNS.some((pattern) => pattern.test(url.toString()))
  })

  if (!publicJobsUrl) return

  throw new Error(
    `Chipper Cash India verified first-party jobs surface changed materially via ${publicJobsUrl.toString()}.`,
  )
}

export const assertVerifiedCareersSurface = (html = '') => {
  const text = normalizeWhitespace(html)

  if (REQUIRED_CAREERS_PATTERNS.every((pattern) => pattern.test(text))) return

  throw new Error(
    'Chipper Cash India verified careers surface changed; review the public contract before promotion.',
  )
}

export const assertVerifiedCurrentOpeningsSurface = (html = '') => {
  const text = normalizeWhitespace(html)

  if (REQUIRED_OPENINGS_PATTERNS.every((pattern) => pattern.test(text))) return

  throw new Error(
    'Chipper Cash India verified current openings surface changed; review the public contract before promotion.',
  )
}

export const assertVerifiedListingContract = (html = '') => {
  const extractedUrls = extractCareerDetailUrls(html, CURRENT_OPENINGS_URL)
  const expectedUrls = uniqueSorted(VERIFIED_PUBLIC_JOBS.map((job) => job.detailUrl))

  if (JSON.stringify(extractedUrls) === JSON.stringify(expectedUrls)) return

  throw new Error(
    'Chipper Cash India verified same-origin listing contract changed materially.',
  )
}

const extractDetailTitle = (html = '') =>
  normalizeWhitespace(String(html).match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i)?.[1] || '')

const extractRoleCountry = (html = '') => {
  const text = normalizeWhitespace(html)
  const match = text.match(
    /\bLocation:\s*This role is based in ([A-Za-z ]+?) and follows a hybrid work arrangement\./i,
  )

  return normalizeWhitespace(match?.[1] || '') || null
}

const extractApplyBy = (html = '') => {
  const text = normalizeWhitespace(html)
  const match = text.match(
    /\bplease send in your application to careers@chippercash\.com by ([^.]+?)\./i,
  )

  return normalizeWhitespace(match?.[1] || '') || null
}

export const extractVerifiedJobDetail = (html = '', expectedJob) => {
  const text = normalizeWhitespace(html)
  const title = extractDetailTitle(html)
  const country = extractRoleCountry(html)
  const applyBy = extractApplyBy(html)

  if (title !== expectedJob.title) {
    throw new Error(
      `Chipper Cash India detail page changed materially for ${expectedJob.detailUrl}.`,
    )
  }

  if (country !== expectedJob.country) {
    throw new Error(
      `Chipper Cash India detail page changed materially for ${expectedJob.detailUrl}.`,
    )
  }

  if (applyBy !== expectedJob.applyBy) {
    throw new Error(
      `Chipper Cash India detail page changed materially for ${expectedJob.detailUrl}.`,
    )
  }

  if (!/\bWho we are\b/i.test(text) || !/\bNext Steps\b/i.test(text) || !/\bcareers@chippercash\.com\b/i.test(text)) {
    throw new Error(
      `Chipper Cash India detail page changed materially for ${expectedJob.detailUrl}.`,
    )
  }

  if (!expectedJob.detailPattern.test(text)) {
    throw new Error(
      `Chipper Cash India detail page changed materially for ${expectedJob.detailUrl}.`,
    )
  }

  const jobId = buildJobIdFromUrl(expectedJob.detailUrl)

  return {
    title,
    company: COMPANY,
    department: expectedJob.department,
    location: country,
    city: null,
    country,
    jobId,
    requisitionId: jobId,
    sourceUrl: expectedJob.detailUrl,
    applyUrl: expectedJob.detailUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: parseHumanDateToIso(applyBy),
    jobDescription: stripDescriptionHtml(html),
    remoteStatus: /\bhybrid work arrangement\b/i.test(text) ? 'Hybrid' : 'On-site',
  }
}

const isIndiaJob = (job = {}) =>
  /\bindia\b/i.test(`${job.location || ''} ${job.country || ''}`)

export const assertVerifiedPastDeadlineOnlyInventory = (jobs = []) => {
  if (!Array.isArray(jobs) || jobs.length !== VERIFIED_PUBLIC_JOBS.length) {
    throw new Error(
      'Chipper Cash India verified stale openings inventory changed materially.',
    )
  }

  const staleInventoryIsStable = jobs.every((job) => {
    if (isIndiaJob(job)) return false
    if (!job.closingDate) return false
    return job.closingDate < VERIFIED_ON_CUTOFF_ISO
  })

  if (staleInventoryIsStable) return

  throw new Error(
    'Chipper Cash India public openings inventory no longer matches the verified stale past-deadline contract; review whether a trustworthy current jobs flow is now available.',
  )
}

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: `${SOURCE}-html`,
    timeoutMs: 15000,
  })

export const extractVerifiedPublicJobs = async ({
  fetchText = defaultFetchText,
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)
  assertVerifiedCareersSurface(careersHtml)
  assertNoUnexpectedExternalJobsSurface(careersHtml, CAREERS_URL)

  const currentOpeningsHtml = await fetchText(CURRENT_OPENINGS_URL)
  assertVerifiedCurrentOpeningsSurface(currentOpeningsHtml)
  assertNoUnexpectedExternalJobsSurface(currentOpeningsHtml, CURRENT_OPENINGS_URL)
  assertVerifiedListingContract(currentOpeningsHtml)

  const selectedJobs = Number.isInteger(maxJobs)
    ? VERIFIED_PUBLIC_JOBS.slice(0, maxJobs)
    : VERIFIED_PUBLIC_JOBS
  const scrapedAt = now()
  const jobs = []

  for (const expectedJob of selectedJobs) {
    const detailHtml = await fetchText(expectedJob.detailUrl)
    const job = extractVerifiedJobDetail(detailHtml, expectedJob)

    jobs.push({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    })
  }

  return jobs
}

export const createChipperCashIndiaScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const jobs = await extractVerifiedPublicJobs({
      fetchText,
      maxJobs,
      now,
    })
    assertVerifiedPastDeadlineOnlyInventory(jobs)
    return []
  },
})

export const run = async (options = {}) => createChipperCashIndiaScraper().run(options)
