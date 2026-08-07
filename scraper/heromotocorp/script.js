import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'
import { HERO_MOTO_CORP_CATALOG } from './catalog.js'

export const PROVIDER_METADATA = HERO_MOTO_CORP_CATALOG
export const COMPANY = PROVIDER_METADATA.companyName
export const SOURCE = PROVIDER_METADATA.source
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VIEW_ALL_JOBS_URL = PROVIDER_METADATA.officialCareersHandoffUrl
export const BASE_URL = new URL(VIEW_ALL_JOBS_URL).origin
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const ATS_PLATFORM = PROVIDER_METADATA.atsPlatform
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const DEFAULT_LOCALE = 'en_GB'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const HERO_SECTION_HEADINGS = new Set([
  'function',
  'pay band',
  'role',
  'a purpose driven role for you',
  'a day in the life',
  'academic qualification & experience',
  'technical skills/knowledge',
  'behavioural skills',
  'what will it be like to work for hero',
  'about hero',
])

const HERO_DESCRIPTION_SECTION_ORDER = [
  'Function',
  'Pay Band',
  'Role',
  'A purpose driven role for you',
  'A Day in the life',
  'Academic Qualification & Experience',
  'Technical Skills/Knowledge',
  'Behavioural Skills',
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&ndash;|&#8211;/gi, '-')
  .replace(/&mdash;|&#8212;/gi, '-')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul)\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' '),
)

const extractBalancedElementInnerHtml = (html, startPattern, tagName) => {
  const page = String(html ?? '')
  const match = startPattern.exec(page)

  if (!match) return null

  const contentStart = match.index + match[0].length
  const tokenPattern = new RegExp(`<${tagName}\\b[^>]*>|</${tagName}\\s*>`, 'gi')
  tokenPattern.lastIndex = contentStart

  let depth = 1
  let tokenMatch = tokenPattern.exec(page)

  while (tokenMatch) {
    if (tokenMatch[0].toLowerCase().startsWith(`</${tagName}`)) {
      depth -= 1
      if (depth === 0) {
        return page.slice(contentStart, tokenMatch.index)
      }
    } else {
      depth += 1
    }

    tokenMatch = tokenPattern.exec(page)
  }

  return null
}

const extractJobDescriptionHtml = (html) => {
  for (const [pattern, tagName] of [
    [
      /<span\b(?=[^>]*itemprop=["']description["'])(?=[^>]*class=["'][^"']*\bjobdescription\b[^"']*["'])[^>]*>/i,
      'span',
    ],
    [
      /<span\b(?=[^>]*class=["'][^"']*\bjobdescription\b[^"']*["'])[^>]*>/i,
      'span',
    ],
    [
      /<div\b(?=[^>]*class=["'][^"']*\bjobdescription\b[^"']*["'])[^>]*>/i,
      'div',
    ],
  ]) {
    const extracted = extractBalancedElementInnerHtml(html, pattern, tagName)
    if (extracted) return extracted
  }

  return null
}

const extractTextLines = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\b[^>]*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|h[1-6]|ul|ol)>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n- ')
  .replace(/<p\b[^>]*>/gi, '\n')
  .replace(/<div\b[^>]*>/gi, '\n')
  .replace(/<h[1-6]\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\r/g, '\n')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const normalizeSectionHeading = (value) => normalizeWhitespace(value)?.toLowerCase() || null

const extractHeroSections = (descriptionHtml) => {
  const sections = new Map()
  let currentSectionKey = null

  for (const line of extractTextLines(descriptionHtml)) {
    const sectionKey = normalizeSectionHeading(line)

    if (sectionKey && HERO_SECTION_HEADINGS.has(sectionKey)) {
      currentSectionKey = sectionKey
      if (!sections.has(sectionKey)) sections.set(sectionKey, [])
      continue
    }

    if (currentSectionKey) {
      sections.get(currentSectionKey).push(line)
    }
  }

  return sections
}

const getHeroSectionLines = (sections, heading) =>
  sections.get(normalizeSectionHeading(heading)) || []

const getHeroSectionText = (sections, heading) =>
  normalizeWhitespace(getHeroSectionLines(sections, heading).join(' '))

const buildHeroDescription = (sections, descriptionHtml) => {
  const parts = HERO_DESCRIPTION_SECTION_ORDER
    .map((heading) => {
      const text = getHeroSectionText(sections, heading)
      return text ? `${heading} ${text}` : null
    })
    .filter(Boolean)

  return parts.length > 0 ? normalizeWhitespace(parts.join(' ')) : stripTags(descriptionHtml)
}

const formatExperienceEvidence = (experienceProfile, evidence) => {
  if (!experienceProfile || !evidence) return null

  if (experienceProfile.minimumYears === 0 && experienceProfile.maximumYears === 0) {
    return 'No experience required'
  }

  if (Number.isFinite(experienceProfile.minimumYears) && Number.isFinite(experienceProfile.maximumYears)) {
    return experienceProfile.minimumYears === experienceProfile.maximumYears
      ? `${experienceProfile.minimumYears} years`
      : `${experienceProfile.minimumYears}-${experienceProfile.maximumYears} years`
  }

  if (Number.isFinite(experienceProfile.minimumYears) && experienceProfile.isOpenEnded) {
    return `${experienceProfile.minimumYears}+ years`
  }

  return evidence
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\+\s*/g, '+')
    .replace(/\byears?\b/i, 'years')
}

const inferExperienceFromText = (text) => {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return null

  const experienceProfile = extractJobFilterSignals({
    description: normalized,
  })?.experienceProfile
  const evidence = normalizeWhitespace(experienceProfile?.evidence)

  if (!evidence || experienceProfile?.confidence !== 'high') {
    return null
  }

  return formatExperienceEvidence(experienceProfile, evidence)
}

const extractExperienceFromSections = (sections, fallbackDescription) => {
  const academicText = getHeroSectionText(sections, 'Academic Qualification & Experience')
  if (academicText) {
    const academicExperience = inferExperienceFromText(academicText)
    if (academicExperience) return academicExperience
  }

  const candidateText = normalizeWhitespace([
    getHeroSectionText(sections, 'Role'),
    getHeroSectionText(sections, 'A purpose driven role for you'),
    getHeroSectionText(sections, 'A Day in the life'),
    academicText,
    getHeroSectionText(sections, 'Technical Skills/Knowledge'),
    getHeroSectionText(sections, 'Behavioural Skills'),
  ].filter(Boolean).join(' '))

  return inferExperienceFromText(candidateText || fallbackDescription)
}

const extractMinimumQualification = (sections) => {
  const academicLines = getHeroSectionLines(sections, 'Academic Qualification & Experience')
  const qualificationLines = academicLines.filter((line) => !inferExperienceFromText(line))

  return normalizeWhitespace(qualificationLines.join(' ')) || null
}

const extractRequiredSkillsFromSections = (sections, descriptionHtml) => {
  const listItems = extractListItems(descriptionHtml)
  if (listItems.length > 0) return listItems

  return [
    ...getHeroSectionLines(sections, 'Technical Skills/Knowledge'),
    ...getHeroSectionLines(sections, 'Behavioural Skills'),
  ]
}

const toAbsoluteUrl = (value) => {
  try {
    return new URL(decodeHtmlEntities(value), BASE_URL).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const normalizePathname = (pathname) => pathname === '/' ? '/' : pathname.replace(/\/+$/, '/')

export const isOfficialJobsBoardUrl = (value) => {
  try {
    const url = new URL(decodeHtmlEntities(value), BASE_URL)
    const pathname = normalizePathname(url.pathname)

    return url.hostname === new URL(BASE_URL).hostname
      && (
        pathname === '/viewalljobs/'
        || (
          pathname === '/search/'
          && url.searchParams.get('createNewAlert') === 'false'
          && url.searchParams.get('q') === ''
        )
      )
  } catch {
    return false
  }
}

export const extractOfficialJobsBoardUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1])
    const text = stripTags(match[2])?.toLowerCase() || ''

    if (!absoluteUrl || !isOfficialJobsBoardUrl(absoluteUrl)) continue
    if (!text.includes('join us') && !text.includes('view all jobs')) continue

    return absoluteUrl
  }

  return null
}

export const hasOfficialHeroMotoCorpCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const normalized = (normalizeWhitespace(page) || '').toLowerCase()

  return normalized.includes('hero motocorp')
    && (normalized.includes('career overview') || normalized.includes('careers'))
    && extractOfficialJobsBoardUrl(page) === VIEW_ALL_JOBS_URL
}

export const buildCategoryPageUrl = (categoryUrl, startRow = 0) => {
  const url = new URL(decodeHtmlEntities(categoryUrl), BASE_URL)

  if (Number.isInteger(startRow) && startRow > 0) {
    url.searchParams.set('startrow', String(startRow))
  }

  return url.toString()
}

export const extractCategoryUrls = (html) => {
  const seen = new Set()
  const categories = []

  for (const match of String(html ?? '').matchAll(
    /<a\b[^>]*href=["']((?:https?:\/\/[^"']+)?\/(?:default\/)?go\/[^"']+)["'][^>]*>/gi,
  )) {
    const categoryUrl = toAbsoluteUrl(match[1])
    if (!categoryUrl || seen.has(categoryUrl)) continue
    seen.add(categoryUrl)
    categories.push(categoryUrl)
  }

  return categories
}

export const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || null
}

export const extractJobIdFromUrl = (value) =>
  extractFirst(/\/(\d+)\/?(?:[#?].*)?$/i, value, (match) => match[1])

export const extractResultsSummary = (html) => {
  const summaryText = stripTags(
    extractFirst(/<span\b[^>]*class=["'][^"']*\bpaginationLabel\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, html)
      || html,
  )

  const match = /Results\s+(\d+)\s+[–-]\s+(\d+)\s+of\s+(\d+)\s+Page\s+(\d+)\s+of\s+(\d+)/i.exec(
    summaryText || '',
  )

  if (!match) {
    return {
      totalResults: null,
      currentPage: null,
      totalPages: null,
      pageSize: null,
    }
  }

  const start = Number.parseInt(match[1], 10)
  const end = Number.parseInt(match[2], 10)
  const totalResults = Number.parseInt(match[3], 10)
  const currentPage = Number.parseInt(match[4], 10)
  const totalPages = Number.parseInt(match[5], 10)

  return {
    totalResults,
    currentPage,
    totalPages,
    pageSize: totalResults === 0 ? 0 : end - start + 1,
  }
}

export const extractSearchResults = (html) => {
  const rows = [...String(html ?? '').matchAll(
    /<tr\b[^>]*class=["'][^"']*\bdata-row\b[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi,
  )]

  return rows
    .map((rowMatch) => {
      const rowHtml = rowMatch[1]
      const relativeLink = normalizeWhitespace(
        extractFirst(
          /<a\b(?=[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/i,
          rowHtml,
        ),
      )
      const sourceUrl = toAbsoluteUrl(relativeLink)
      const jobId = extractJobIdFromUrl(sourceUrl)
      const title = normalizeWhitespace(
        extractFirst(/<a\b[^>]*class=["'][^"']*\bjobTitle-link\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i, rowHtml),
      )
      const department = normalizeWhitespace(
        extractFirst(/<span\b[^>]*class=["'][^"']*\bjobDepartment\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, rowHtml),
      )
      const location = normalizeWhitespace(
        extractFirst(
          /<td\b[^>]*class=["'][^"']*\bcolLocation\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
          rowHtml,
        ) || extractFirst(
          /<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>\s*<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
          rowHtml,
        ) || extractFirst(
          /<span\b[^>]*class=["'][^"']*\bjobLocation\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
          rowHtml,
        ),
      )
      const postingDate = normalizeWhitespace(
        extractFirst(
          /<td\b[^>]*class=["'][^"']*\bcolDate\b[^"']*["'][^>]*>[\s\S]*?<span\b[^>]*class=["'][^"']*\bjobDate\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
          rowHtml,
        ) || extractFirst(/<span\b[^>]*class=["'][^"']*\bjobDate\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i, rowHtml),
      )

      if (!title || !location || !sourceUrl || !jobId) return null

      return {
        title,
        department,
        location,
        city: extractCity(location),
        jobId,
        requisitionId: jobId,
        sourceUrl,
        postingDate,
      }
    })
    .filter(Boolean)
}

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

export const extractJobDetail = (html, listing = {}) => {
  const descriptionHtml = extractJobDescriptionHtml(html)
  const sections = extractHeroSections(descriptionHtml)
  const jobDescription = buildHeroDescription(sections, descriptionHtml)
  const experienceRequired = extractExperienceFromSections(sections, jobDescription)
  const minimumQualification = extractMinimumQualification(sections)

  const applyPath = normalizeWhitespace(
    extractFirst(
      /<a\b[^>]*class=["'][^"']*\bapply\b[^"']*\bdialogApplyBtn\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
      html,
    ),
  )

  const jobId = normalizeWhitespace(
    extractFirst(/\/apply\/(\d+)\/\?locale=/i, applyPath),
  ) || listing.jobId || null

  return {
    title: normalizeWhitespace(
      extractFirst(/<(?:span|h1)\b[^>]*itemprop=["']title["'][^>]*>([\s\S]*?)<\/(?:span|h1)>/i, html),
    ) || listing.title || null,
    department: listing.department || null,
    location: listing.location || null,
    city: listing.city || extractCity(listing.location) || null,
    jobId,
    requisitionId: listing.requisitionId || jobId,
    sourceUrl: listing.sourceUrl || null,
    employmentType: 'Full-time',
    experienceRequired,
    publicExperienceChecked: Boolean(descriptionHtml),
    minimumQualification,
    preferredQualification: null,
    requiredSkills: extractRequiredSkillsFromSections(sections, descriptionHtml),
    postingDate: normalizeWhitespace(
      extractFirst(/itemprop=["']datePosted["'][^>]*content=["']([^"']+)["']/i, html),
    ) || listing.postingDate || null,
    closingDate: normalizeWhitespace(
      extractFirst(/itemprop=["']validThrough["'][^>]*content=["']([^"']+)["']/i, html),
    ) || null,
    jobDescription,
    applyUrl:
      toAbsoluteUrl(applyPath)
      || (jobId ? toAbsoluteUrl(`/talentcommunity/apply/${jobId}/?locale=${DEFAULT_LOCALE}`) : null),
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createHeroMotoCorpScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    maxCategoryPages = Number.POSITIVE_INFINITY,
    maxJobs = null,
    now = () => new Date().toISOString(),
  } = {}) {
    const officialCareersHtml = await fetchText(OFFICIAL_CAREERS_URL)
    if (!hasOfficialHeroMotoCorpCareersSignals(officialCareersHtml)) {
      throw new Error('Hero MotoCorp verified official careers page no longer matches the verified public surface')
    }

    const categoryDiscoveryHtml = await fetchText(VIEW_ALL_JOBS_URL)
    const categoryUrls = extractCategoryUrls(categoryDiscoveryHtml)
    const listingSources = categoryUrls.length > 0 ? categoryUrls : [VIEW_ALL_JOBS_URL]
    const jobs = []
    const seenJobIds = new Set()

    for (const categoryUrl of listingSources) {
      let startRow = 0
      let pageNumber = 1

      while (pageNumber <= maxCategoryPages) {
        const categoryPageUrl = buildCategoryPageUrl(categoryUrl, startRow)
        const listingHtml =
          categoryUrls.length === 0 && categoryUrl === VIEW_ALL_JOBS_URL && pageNumber === 1
            ? categoryDiscoveryHtml
            : await fetchText(categoryPageUrl)
        const listings = extractSearchResults(listingHtml)
        const summary = extractResultsSummary(listingHtml)
        const jobsBeforePage = jobs.length

        if (listings.length === 0) break

        for (const listing of listings) {
          if (seenJobIds.has(listing.jobId)) continue
          seenJobIds.add(listing.jobId)

          const detailHtml = await fetchText(listing.sourceUrl)
          const detail = extractJobDetail(detailHtml, listing)

          jobs.push({
            jobId: detail.jobId || listing.jobId,
            requisitionId: detail.requisitionId || listing.requisitionId,
            title: detail.title || listing.title,
            company: COMPANY,
            department: detail.department || listing.department || null,
            location: detail.location || listing.location,
            city: detail.city || listing.city,
            link: detail.applyUrl || detail.sourceUrl || listing.sourceUrl,
            applyUrl: detail.applyUrl || listing.sourceUrl,
            sourceUrl: detail.sourceUrl || listing.sourceUrl,
            source: SOURCE,
            employmentType: detail.employmentType,
            experienceRequired: detail.experienceRequired,
            publicExperienceChecked: detail.publicExperienceChecked,
            jobDescription: detail.jobDescription,
            minimumQualification: detail.minimumQualification,
            preferredQualification: detail.preferredQualification,
            requiredSkills: detail.requiredSkills,
            postingDate: detail.postingDate || listing.postingDate,
            closingDate: detail.closingDate || null,
            scrapedAt: now(),
          })

          if (maxJobs && jobs.length >= maxJobs) {
            return jobs
          }
        }

        if (summary.totalPages && pageNumber >= summary.totalPages) break
        if (!summary.totalPages && jobs.length === jobsBeforePage) break
        if (!summary.totalPages && listings.length === 0) break
        startRow += summary.pageSize || listings.length
        pageNumber += 1
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createHeroMotoCorpScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
