import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'openupconstruction'
export const COMPANY = 'Open Up Construction'
export const COMPANY_DOMAIN = 'openupgroup.co.jp'
export const CAREERS_URL = 'https://goodwork.openupgroup.co.jp/job-info/opc/'
export const MIDCAREER_URL = 'https://goodwork.openupgroup.co.jp/job-info/opc/application/'
export const NEW_GRADUATE_URL = 'https://goodwork.openupgroup.co.jp/job-info/opc/newgraduate/'
export const FIRST_PARTY_LISTING_URLS = [
  MIDCAREER_URL,
  NEW_GRADUATE_URL,
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREERS_TITLE_PATTERN = /<title>\s*オープンアップコンストラクション\s*\|\s*オープンアップブランドサイト\s*<\/title>/i
const DETAIL_TITLE_PATTERNS = new Map([
  [MIDCAREER_URL, /<title>\s*募集要項（中途未経験）\s*\|\s*オープンアップブランドサイト\s*<\/title>/i],
  [NEW_GRADUATE_URL, /<title>\s*募集要項（新卒）\s*\|\s*オープンアップブランドサイト\s*<\/title>/i],
])

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

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/main|\/tr|\/td|\/th|\/table)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(value)
    const pathname = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.origin}${pathname}`.toLowerCase()
  } catch {
    return null
  }
}

const isExpectedUrl = (actualUrl, expectedUrl) =>
  normalizeComparableUrl(actualUrl) === normalizeComparableUrl(expectedUrl)

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const extractAnchorHref = (html, textPattern) => {
  const source = String(html ?? '')
  const pattern = new RegExp(
    `<a[^>]+href=["']([^"']+)["'][^>]*>\\s*${textPattern.source}\\s*<\\/a>`,
    textPattern.flags,
  )

  const match = source.match(pattern)
  return match?.[1] ? new URL(match[1], CAREERS_URL).toString() : null
}

const extractStrongValue = (html, label) => {
  const match = String(html ?? '').match(
    new RegExp(
      `<strong[^>]*>\\s*${escapeRegex(label)}\\s*<\\/strong>\\s*<\\/p>\\s*<p[^>]*>([\\s\\S]*?)<\\/p>`,
      'i',
    ),
  )

  return normalizeWhitespace(match?.[1])
}

const extractSection = (text, label, nextLabels) => {
  const pattern = new RegExp(
    `${escapeRegex(label)}\\s+([\\s\\S]*?)(?=\\s+(?:${nextLabels.map(escapeRegex).join('|')})\\s+|$)`,
    'i',
  )

  return normalizeWhitespace(text.match(pattern)?.[1])
}

const buildJobId = (sourceUrl) => {
  if (isExpectedUrl(sourceUrl, MIDCAREER_URL)) return 'opc-midcareer'
  if (isExpectedUrl(sourceUrl, NEW_GRADUATE_URL)) return 'opc-newgraduate'
  throw new Error('Open Up Construction detail route no longer matches the verified first-party pages')
}

const buildAudienceTag = (sourceUrl) => {
  if (isExpectedUrl(sourceUrl, MIDCAREER_URL)) return 'midcareer'
  if (isExpectedUrl(sourceUrl, NEW_GRADUATE_URL)) return 'newgraduate'
  throw new Error('Open Up Construction detail route no longer matches the verified first-party pages')
}

const summarizeLocation = (locationSection) => {
  if (String(locationSection ?? '').includes('全国の各プロジェクト先')) {
    return 'Nationwide project sites, Japan'
  }

  return null
}

const extractPreferredQualification = (title, candidateProfile) => {
  const match = `${title || ''} ${candidateProfile || ''}`.match(/CAD（[^）]+）習得者尚可[。！]?/)
  return normalizeWhitespace(match?.[0])
}

const buildDescription = ({
  audience,
  candidateProfile,
  employmentType,
  workingHours,
  locationSection,
  compensation,
  allowances,
  holidays,
}) => [
  audience ? `Target: ${audience}` : null,
  candidateProfile ? `Candidate profile: ${candidateProfile}` : null,
  employmentType ? `Employment type: ${employmentType}` : null,
  workingHours ? `Working hours: ${workingHours}` : null,
  locationSection ? `Location: ${locationSection}` : null,
  compensation ? `Compensation: ${compensation}` : null,
  allowances ? `Allowances: ${allowances}` : null,
  holidays ? `Holidays: ${holidays}` : null,
].filter(Boolean).join(' ')

export const hasVerifiedCareersHub = (html) => {
  const source = String(html ?? '')
  const text = stripTags(source) || ''

  return CAREERS_TITLE_PATTERN.test(source)
    && text.includes('JOB DESCRIPTION 求人情報 オープンアップコンストラクション')
    && extractStrongValue(source, '募集求人') === '施工管理技術者'
    && extractStrongValue(source, '対象') === '新卒・中途未経験'
    && extractAnchorHref(source, /中途未経験\s*[：:]\s*募集要項・応募フォーム/i) !== null
    && extractAnchorHref(source, /新卒採用\s*[：:]\s*募集要項・応募フォーム/i) !== null
}

export const extractFirstPartyListingLinks = (html) => {
  const midcareerLink = extractAnchorHref(html, /中途未経験\s*[：:]\s*募集要項・応募フォーム/i)
  const newGraduateLink = extractAnchorHref(html, /新卒採用\s*[：:]\s*募集要項・応募フォーム/i)

  return [midcareerLink, newGraduateLink].filter(Boolean)
}

export const extractJobDetail = (html, { sourceUrl } = {}) => {
  const comparableUrl = normalizeComparableUrl(sourceUrl)
  const expectedTitlePattern = comparableUrl
    ? Array.from(DETAIL_TITLE_PATTERNS.entries()).find(([url]) => isExpectedUrl(comparableUrl, url))?.[1]
    : null

  if (!expectedTitlePattern) {
    throw new Error('Open Up Construction detail route no longer matches the verified first-party pages')
  }

  const source = String(html ?? '')
  const text = stripTags(source) || ''
  const roleTitle = extractStrongValue(source, '募集求人')
  const audience = extractStrongValue(source, '対象')
  const employmentType = extractStrongValue(source, '雇用形態')
  const workingHours = extractStrongValue(source, '勤務時間')
  const applyUrl = isExpectedUrl(sourceUrl, MIDCAREER_URL)
    ? extractAnchorHref(source, /中途未経験\s*[：:]\s*募集要項・応募フォーム/i)
    : extractAnchorHref(source, /新卒採用\s*[：:]\s*募集要項・応募フォーム/i)
  const locationSection = extractSection(text, '勤務地', ['給与'])
  const compensation = extractSection(text, '給与', ['昇給・賞与', '諸手当'])
  const allowances = extractSection(text, '諸手当', ['休日・休暇'])
  const holidays = extractSection(text, '休日・休暇', ['福利厚生', '応募はオープンアップコンストラクションのサイトから', 'TOP'])
  const candidateProfile = extractSection(text, '対象となる方', ['募集要項'])

  if (
    !expectedTitlePattern.test(source)
    || !text.includes('JOB APPLICATION 募集要項（応募フォーム） オープンアップコンストラクション')
    || !roleTitle
    || !audience
    || !employmentType
    || !workingHours
    || !locationSection?.includes('全国の各プロジェクト先')
    || !compensation?.includes('未経験者 給与例')
    || !holidays?.includes('年間休日120日')
    || !applyUrl?.includes('www55.rpm-sys.jp')
  ) {
    throw new Error('Open Up Construction verified first-party job detail page changed materially')
  }

  const jobId = buildJobId(sourceUrl)
  const audienceTag = buildAudienceTag(sourceUrl)
  const location = summarizeLocation(locationSection)

  if (!location) {
    throw new Error('Open Up Construction verified first-party job detail page changed materially')
  }

  return {
    title: roleTitle,
    company: COMPANY,
    department: 'Construction',
    location,
    city: null,
    country: 'Japan',
    employmentType,
    experienceRequired: audienceTag === 'midcareer' ? audience : '新卒',
    minimumQualification: audienceTag === 'midcareer' ? candidateProfile : audience,
    preferredQualification: extractPreferredQualification(roleTitle, candidateProfile),
    requiredSkills: [],
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl,
    companyCareerPage: CAREERS_URL,
    companyDomain: COMPANY_DOMAIN,
    atsPlatform: 'rpm-sys',
    postingDate: null,
    closingDate: null,
    jobDescription: buildDescription({
      audience,
      candidateProfile,
      employmentType,
      workingHours,
      locationSection,
      compensation,
      allowances,
      holidays,
    }),
  }
}

export const createOpenUpConstructionScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)

    if (
      careersPage.status !== 200
      || !isExpectedUrl(careersPage.url, CAREERS_URL)
      || !hasVerifiedCareersHub(careersPage.html)
    ) {
      throw new Error('Open Up Construction verified first-party careers hub changed materially')
    }

    const listingLinks = extractFirstPartyListingLinks(careersPage.html)
    if (
      listingLinks.length !== FIRST_PARTY_LISTING_URLS.length
      || listingLinks.some((url, index) => !isExpectedUrl(url, FIRST_PARTY_LISTING_URLS[index]))
    ) {
      throw new Error('Open Up Construction verified first-party listing links changed materially')
    }

    const jobs = []

    for (const listingUrl of listingLinks) {
      const detailPage = await fetchPage(listingUrl)

      if (detailPage.status !== 200 || !isExpectedUrl(detailPage.url, listingUrl)) {
        throw new Error('Open Up Construction verified first-party job detail page changed materially')
      }

      jobs.push(extractJobDetail(detailPage.html, { sourceUrl: listingUrl }))
    }

    return jobs
  },
})

export const run = async (options = {}) => createOpenUpConstructionScraper().run(options)

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
