import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { normalizeScrapedJob } from '../../scraper-support/utils/normalizeScrapedJob.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'blastlineindiapvtltd'
export const COMPANY = 'BLASTLINE INDIA PVT LTD'
export const HOMEPAGE_URL = 'https://blastlineindia.com/'
export const CAREERS_URL = 'https://blastlineindia.com/about-us/careers/'
export const CAREERS_PAGE_API_URL = 'https://blastlineindia.com/wp-json/wp/v2/pages/2957'
export const APPLICATION_ANCHOR_URL = 'https://blastlineindia.com/about-us/careers/#career-form'
export const JOB_BOARD_URL = 'https://careers.blastlineindia.com/'

const COMPANY_DOMAIN = 'blastlineindia.com'
const ATS_PLATFORM = 'official-company-careers'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&#039;|&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&quot;/gi, '"')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/h[1-6]|\/section|\/article|\/span)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|ul|ol|h[1-6]|section|article|span)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const buildAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/^full[\s-]?time$/i.test(normalized)) return 'Full-time'
  if (/^part[\s-]?time$/i.test(normalized)) return 'Part-time'
  return normalized
}

const normalizeRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  if (normalized.includes('on-site') || normalized.includes('onsite')) return 'On-site'
  return null
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const buildJobId = ({ title, location }) => `${SOURCE}-${slugify(`${title} ${location}`)}`

const extractFirstHeading = (html) => stripTags(
  String(html ?? '').match(/<h2\b[^>]*class="[^"]*elementor-heading-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)?.[1],
)

const extractFieldValue = (label, html) => {
  const escapedLabel = String(label ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(
      `<span[^>]*>\\s*${escapedLabel}\\s*<\\/span>\\s*<\\/h3>\\s*<p[^>]*class="[^"]*elementor-icon-box-description[^"]*"[^>]*>([\\s\\S]*?)<\\/p>`,
      'i',
    ),
  )

  return stripTags(match?.[1] || null)
}

const extractSectionParagraph = (label, html) => {
  const escapedLabel = String(label ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(`${escapedLabel}\\s*<\\/h2>\\s*<p>([\\s\\S]*?)<\\/p>`, 'i'),
  )

  return stripTags(match?.[1] || null)
}

const extractSectionList = (label, html) => {
  const escapedLabel = String(label ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(html ?? '').match(
    new RegExp(`${escapedLabel}[\\s\\S]*?<ul>([\\s\\S]*?)<\\/ul>`, 'i'),
  )

  return extractListItems(match?.[1] || null)
}

const extractTabTitles = (html) => [...String(html ?? '').matchAll(
  /<span[^>]*class="[^"]*\be-n-tab-title-text\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractTabPanels = (html) => [...String(html ?? '').matchAll(
  /<div id="e-n-tab-content-[^"]+"[^>]*role="tabpanel"[\s\S]*?(?=<div id="e-n-tab-content-[^"]+"[^>]*role="tabpanel"|<div[^>]+id="career-form"|$)/gi,
)]
  .map((match) => match[0])
  .filter(Boolean)

const normalizeApplyUrl = (value) => {
  const absolute = buildAbsoluteUrl(value, CAREERS_URL)
  if (!absolute) return null

  try {
    const parsed = new URL(absolute)
    if (parsed.hash === '#career-form') return APPLICATION_ANCHOR_URL
    return parsed.toString()
  } catch {
    return null
  }
}

const buildJobDescription = ({ responsibility, requiredSkills }) => {
  const sections = []

  if (responsibility) {
    sections.push(`Responsibility: ${responsibility}`)
  }

  if (requiredSkills.length > 0) {
    sections.push(`Key Responsibilities:\n${requiredSkills.map((item) => `- ${item}`).join('\n')}`)
  }

  return sections.join('\n\n') || null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Home\s*-\s*Blastline India\s*<\/title>/i.test(page)
    && /Setting the benchmark in Abrasive Blasting &amp; Surface Preparation/i.test(page)
    && /Blastline India Pvt\.\s*Ltd\.\s*is a leading provider of solutions for surface preparation/i.test(text)
    && /Blastline 2025/i.test(text)
}

export const hasVerifiedCareersLink = (html) => {
  const page = String(html ?? '')

  return /href=["']https:\/\/blastlineindia\.com\/about-us\/careers\/["']/i.test(page)
    || /href=["']https:\/\/blastlineindia\.com\/careers\/#?["']/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Careers\s*-\s*Blastline India\s*<\/title>/i.test(page)
    && /Current Openings/i.test(text)
    && /Apply Now/i.test(text)
    && /id=["']career-form["']/i.test(page)
    && /name=["']Position["']/i.test(page)
    && /name=["']resume_input["']/i.test(page)
  }

export const extractRenderedHtmlFromPagePayload = (payload) => {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload

  if (
    !parsed
    || parsed.id !== 2957
    || parsed.slug !== 'careers'
    || parsed.link !== CAREERS_URL
    || parsed.title?.rendered !== 'Careers'
  ) {
    throw new Error('Blastline verified page payload no longer matches the official careers page')
  }

  const renderedHtml = parsed.content?.rendered
  if (
    !renderedHtml
    || !/Current Openings/i.test(renderedHtml)
    || !/id="career-form"/i.test(renderedHtml)
    || !/e-n-tab-title-text/i.test(renderedHtml)
  ) {
    throw new Error('Blastline verified page payload no longer exposes the current public openings contract')
  }

  return renderedHtml
}

export const extractPublicJobs = (html) => {
  const renderedHtml = String(html ?? '')
  const titles = extractTabTitles(renderedHtml)
  const panels = extractTabPanels(renderedHtml)

  if (
    !/Current Openings/i.test(renderedHtml)
    || !/id="career-form"/i.test(renderedHtml)
    || titles.length === 0
    || titles.length !== panels.length
  ) {
    throw new Error('Blastline verified inline public openings no longer match the expected tabbed careers contract')
  }

  const jobs = panels.map((panelHtml, index) => {
    const title = titles[index]
    const panelTitle = extractFirstHeading(panelHtml)
    if (!title || !panelTitle || title !== panelTitle) {
      throw new Error('Blastline verified inline public openings no longer match the expected title-to-panel contract')
    }

    const location = extractFieldValue('Job Location:', panelHtml)
    const employmentType = normalizeEmploymentType(extractFieldValue('Employment Type:', panelHtml))
    const workplaceType = extractFieldValue('Work place Type:', panelHtml)
    const experienceRequired = extractFieldValue('Experience Required:', panelHtml)
      || normalizeWhitespace(
        String(panelHtml).match(/Experience:\s*([^<]+)/i)?.[1],
      )
    const applyUrl = normalizeApplyUrl(
      String(panelHtml).match(/<a\b[^>]*href="([^"]*#career-form[^"]*)"[^>]*>/i)?.[1],
    )
    const responsibility = extractSectionParagraph('Responsibility:', panelHtml)
    const requiredSkills = extractSectionList('Key Responsibilities', panelHtml)

    if (!location || !employmentType || !experienceRequired || !applyUrl) {
      throw new Error('Blastline verified inline public openings no longer expose the required job fields')
    }

    return {
      title,
      company: COMPANY,
      department: null,
      location,
      city: normalizeCity(location.split(',')[0]?.trim()) || normalizeWhitespace(location.split(',')[0]),
      country: 'India',
      jobId: buildJobId({ title, location }),
      requisitionId: buildJobId({ title, location }),
      sourceUrl: CAREERS_URL,
      applyUrl,
      employmentType,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills,
      postingDate: null,
      closingDate: null,
      jobDescription: buildJobDescription({ responsibility, requiredSkills }),
      remoteStatus: normalizeRemoteStatus(workplaceType),
    }
  })

  if (jobs.length === 0) {
    throw new Error('Blastline verified inline public openings no longer expose any roles')
  }

  return jobs
}

export const hasOfficialBoardHandoff = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Careers\s*-\s*Blastline India\s*<\/title>/i.test(page)
    && /Current Openings/i.test(stripTags(page))
    && /<a\b[^>]*href=["']https:\/\/careers\.blastlineindia\.com\/["'][^>]*>\s*VIEW OPEN POSITIONS\s*<\/a>/i.test(page)
}

const hasVerifiedBoardPagePayload = (payload) => {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
  return parsed?.id === 2957
    && parsed?.slug === 'careers'
    && parsed?.link === CAREERS_URL
    && parsed?.title?.rendered === 'Careers'
    && /Current Openings/i.test(parsed?.content?.rendered ?? '')
    && /href=["']https:\/\/careers\.blastlineindia\.com\/["']/i.test(parsed?.content?.rendered ?? '')
}

export const extractBoardCards = (html) => {
  const page = String(html ?? '')
  if (!/<title>\s*Careers\s*\|\s*Blastline India\s*<\/title>/i.test(page)
    || !/Blastline India Pvt Ltd/i.test(page)) {
    throw new Error('Blastline official board no longer matches the verified company surface')
  }

  const articles = [...page.matchAll(/<article\b[^>]*class=["'][^"']*\bjob-card\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)]
  if (articles.length === 0) throw new Error('Blastline official board no longer exposes job cards')

  return articles
    .map((match) => {
      const article = match[1]
      const company = stripTags(article.match(/<span\b[^>]*class=["'][^"']*\bcompany-badge\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1])
      if (company !== 'Blastline India') return null

      const titleMatch = article.match(/<h3>\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i)
      const title = stripTags(titleMatch?.[2])
      const url = buildAbsoluteUrl(titleMatch?.[1], JOB_BOARD_URL)
      const facts = [...article.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((item) => stripTags(item[1]))
      if (!title || !url || new URL(url).origin !== new URL(JOB_BOARD_URL).origin
        || !new URL(url).pathname.startsWith('/jobs/') || !facts[0]) {
        throw new Error('Blastline official board job card no longer matches the verified role contract')
      }
      return { title, url, location: facts[0], department: facts[1] || null, experienceRequired: facts[2] || null }
    })
    .filter(Boolean)
}

export const extractBoardJob = (html, card) => {
  const page = String(html ?? '')
  const ldJson = page.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]
  let posting
  try {
    posting = JSON.parse(ldJson)
  } catch {
    throw new Error(`Blastline official board job has no readable JobPosting: ${card.url}`)
  }
  if (posting?.['@type'] !== 'JobPosting'
    || posting.title !== card.title
    || posting.hiringOrganization?.name !== 'Blastline India Pvt Ltd'
    || posting.hiringOrganization?.sameAs !== HOMEPAGE_URL.replace(/\/$/, '')
    || posting.jobLocation?.address?.addressCountry !== 'IN'
    || posting.directApply !== true
    || !/<form\b[^>]*class=["'][^"']*\bapply-form\b/i.test(page)
    || !/<h2\s+id=["']apply["']>Apply for this role<\/h2>/i.test(page)) {
    throw new Error(`Blastline official board job no longer matches the verified application surface: ${card.url}`)
  }

  const slug = new URL(card.url).pathname.split('/').filter(Boolean).at(-1)
  const city = card.location.includes(',')
    ? normalizeCity(card.location.split(',')[0].trim()) || card.location.split(',')[0].trim()
    : null
  return {
    title: card.title,
    company: COMPANY,
    department: card.department,
    location: card.location,
    city,
    country: 'India',
    jobId: `${SOURCE}-${slug}`,
    requisitionId: `${SOURCE}-${slug}`,
    sourceUrl: card.url,
    applyUrl: `${card.url}#apply`,
    employmentType: normalizeEmploymentType(String(posting.employmentType ?? '').replace(/_/g, '-')),
    experienceRequired: card.experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: posting.datePosted || null,
    closingDate: posting.validThrough || null,
    jobDescription: stripTags(posting.description),
    remoteStatus: null,
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

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: `${SOURCE}-json`,
  timeoutMs: 15000,
})

const buildNormalizedJob = (job, now) => {
  const normalized = normalizeScrapedJob({
    ...job,
    source: SOURCE,
    companyCareerPage: CAREERS_URL,
    companyDomain: COMPANY_DOMAIN,
    atsPlatform: ATS_PLATFORM,
    scrapedAt: now(),
  }, {
    companyName: COMPANY,
    companyCareerPage: CAREERS_URL,
    companyDomain: COMPANY_DOMAIN,
    atsPlatform: ATS_PLATFORM,
    countryFilter: 'India',
  })

  return {
    ...normalized,
    link: normalized.applyUrl || normalized.sourceUrl,
  }
}

export const createBlastlineIndiaPvtLtdScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now: overrideNow,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml) || !hasVerifiedCareersLink(homepageHtml)) {
      throw new Error('Blastline verified official homepage no longer matches the known first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (hasOfficialBoardHandoff(careersHtml)) {
      const payload = await fetchJson(CAREERS_PAGE_API_URL)
      if (!hasVerifiedBoardPagePayload(payload)) {
        throw new Error('Blastline verified careers payload no longer links to the official board')
      }
      const boardHtml = await fetchText(JOB_BOARD_URL)
      const cards = extractBoardCards(boardHtml)
      if (cards.length === 0) throw new Error('Blastline official board has no Blastline India roles')
      const timestampFactory = overrideNow || now
      const jobs = await Promise.all(cards.map(async (card) =>
        extractBoardJob(await fetchText(card.url), card)))
      return jobs.map((job) => buildNormalizedJob(job, timestampFactory))
    }

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Blastline verified public careers surface no longer matches the known first-party jobs page')
    }

    const payload = await fetchJson(CAREERS_PAGE_API_URL)
    const renderedHtml = extractRenderedHtmlFromPagePayload(payload)
    const timestampFactory = overrideNow || now

    return extractPublicJobs(renderedHtml).map((job) => buildNormalizedJob(job, timestampFactory))
  },
})

export const run = async (options = {}) => createBlastlineIndiaPvtLtdScraper().run(options)

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
