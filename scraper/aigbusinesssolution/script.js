import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { AIG_BUSINESS_SOLUTION_CATALOG } from './catalog.js'

export const SOURCE = AIG_BUSINESS_SOLUTION_CATALOG.source
export const COMPANY_NAME = AIG_BUSINESS_SOLUTION_CATALOG.companyName
export const CAREERS_URL = AIG_BUSINESS_SOLUTION_CATALOG.homepageUrl
export const OPENINGS_URL = AIG_BUSINESS_SOLUTION_CATALOG.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|section|article|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const escapeRegExp = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isVerifiedSameDomainAsset = (value) => {
  try {
    const url = new URL(value, OPENINGS_URL)
    return url.origin === 'https://aighealthcare.in'
      && /^\/uploads\/images\/[^?#]+\.(?:pdf|docx?)$/i.test(url.pathname)
  } catch {
    return false
  }
}

const getAbsoluteAssetUrl = (value) => {
  try {
    return new URL(value, OPENINGS_URL).toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersShellSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Careers\s*\|\s*AIG Healthcare\s*<\/title>/i.test(page)
    && normalized.includes('Join Our Dynamic Team')
    && normalized.includes('Current Job Openings')
    && [...page.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
      .some((match) => new URL(match[1], CAREERS_URL).toString() === OPENINGS_URL)
}

export const hasOfficialOpeningsSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Openings\s*\|\s*AIG Healthcare\s*<\/title>/i.test(page)
    && normalized.includes('Join the rightful revolution, Join AIG Healthcare')
    && normalized.includes('Welcome to IKS Health')
    && /https:\/\/eiyi\.fa\.ap1\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_3001/i.test(page)
}

export const extractOpenings = (html = '') => {
  const page = String(html ?? '')
  const jobs = []

  for (const cardMatch of page.matchAll(/<div\b[^>]*class=["'][^"']*opening-card[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    const cardHtml = cardMatch[1]
    const links = [...cardHtml.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => ({
        href: getAbsoluteAssetUrl(match[1]),
        text: normalizeWhitespace(match[2]),
      }))
      .filter((link) => link.href && link.text && isVerifiedSameDomainAsset(link.href))

    if (links.length < 2) continue

    const titleLink = links[0]
    const levelLink = links.find((link) => link.href === titleLink.href && link.text !== titleLink.text) || links[1]

    if (!titleLink.text || !levelLink?.text) continue

    jobs.push({
      title: titleLink.text,
      level: levelLink.text,
      sourceUrl: titleLink.href,
      applyUrl: titleLink.href,
      link: titleLink.href,
    })
  }

  return jobs.filter((job, index, items) =>
    items.findIndex((candidate) => candidate.applyUrl === job.applyUrl && candidate.title === job.title) === index,
  )
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createAigBusinessSolutionScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersShellSignal(careersHtml)) {
      throw new Error('AIG Business Solution verified careers shell no longer matches the pinned first-party surface')
    }

    const openingsHtml = await fetchText(OPENINGS_URL)
    if (!hasOfficialOpeningsSignal(openingsHtml)) {
      throw new Error('AIG Business Solution verified openings page no longer matches the pinned first-party surface')
    }

    return extractOpenings(openingsHtml).map((job) => ({
      title: job.title,
      company: COMPANY_NAME,
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: job.applyUrl,
      requisitionId: job.applyUrl,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: `Level: ${job.level}`,
      remoteStatus: null,
      source: SOURCE,
      link: job.link,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createAigBusinessSolutionScraper().run(options)

