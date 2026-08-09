import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lakechemicalspvtltd'
export const COMPANY = 'Lake Chemicals Pvt. Ltd'
export const HOMEPAGE_URL = 'https://lakechemicals.com/'
export const JOB_SEARCH_URL = 'https://lakechemicals.com/job-search'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? '')).replace(/<[^>]+>/g, ' '),
)

const normalizeRichText = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<li[^>]*>/gi, '\n- ')
  .replace(/<\/li>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n+/g, '\n')
  .replace(/[ \t]{2,}/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Home\s*<\/title>/i.test(page)
    && /<meta[^>]+property=["']og:url["'][^>]+content=["']https:\/\/lakechemicals\.com\/home-1["']/i.test(page)
    && /Pharmaceutical Manufacturing and API Development/i.test(text)
    && /Commitment to Quality/i.test(text)
    && /Attibele Industrial Area/i.test(text)
    && /href=["']\/job-search["']/i.test(page)
}

export const hasOfficialJobSearchSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Job Search\s*\|\s*Lake Chemicals\s*<\/title>/i.test(page)
    && /<meta[^>]+property=["']og:url["'][^>]+content=["']https:\/\/lakechemicals\.com\/job-search["']/i.test(page)
    && /WE(?:&#x27;|&#39;|')RE HIRING!!/i.test(page)
    && /Join Our Team/i.test(text)
    && /hrcorp@lakechemicals\.com/i.test(page)
    && /Attach Resume/i.test(text)
    && /Submit Application/i.test(text)
}

const ROLE_HEADLINE_PATTERN =
  /data-aid=["']CONTENT_HEADLINE(\d+)_RENDERED["'][^>]*>(.*?)<\/h4>/gi

const extractSection = (text, label, nextLabel = null) => {
  const pattern = nextLabel
    ? new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)\\s*${nextLabel}\\s*:`, 'i')
    : new RegExp(`${label}\\s*:\\s*([\\s\\S]*)$`, 'i')

  const match = text.match(pattern)
  return normalizeWhitespace(match?.[1] ?? '')
}

const parseSkills = (skillsText) => skillsText
  .replace(/^\-\s*/, '')
  .split(/\s+-\s+/)
  .map((item) => normalizeWhitespace(item))
  .filter(Boolean)

const parseRoleCard = (rawTitle, rawDescription) => {
  const title = stripTags(rawTitle)
  const normalizedBlock = normalizeRichText(rawDescription)
  const qualification = extractSection(normalizedBlock, 'Qualification', 'Experience')
  const experience = extractSection(normalizedBlock, 'Experience', 'Skills')
  const skillsText = extractSection(normalizedBlock, 'Skills', 'Location')
  const location = extractSection(normalizedBlock, 'Location')
  const requiredSkills = parseSkills(skillsText)
  const jobId = `${SOURCE}-${slugify(title)}`

  if (!title || !qualification || !experience || !location || requiredSkills.length === 0) {
    throw new Error('Lake Chemicals verified public job cards changed shape')
  }

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city: null,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: `${JOB_SEARCH_URL}#${jobId}`,
    applyUrl: JOB_SEARCH_URL,
    employmentType: null,
    workplaceType: null,
    experienceRequired: experience,
    minimumQualification: qualification,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeWhitespace(
      `Qualification: ${qualification}. `
        + `Experience: ${experience}. `
        + `Skills: ${requiredSkills.join('; ')}. `
        + `Location: ${location}. `
        + 'Apply via the official Lake Chemicals job search page.',
    ),
  }
}

const extractRoleCardPairs = (html) => {
  const page = String(html ?? '')
  const headlineMatches = [...page.matchAll(ROLE_HEADLINE_PATTERN)]

  if (headlineMatches.length !== 6) {
    throw new Error('Lake Chemicals verified public job cards changed shape')
  }

  return headlineMatches.map((match, index) => {
    const [rawMatch, descriptionIndex, rawTitle] = match
    const sectionStart = (match.index ?? 0) + rawMatch.length
    const sectionEnd = headlineMatches[index + 1]?.index ?? page.length
    const sectionHtml = page.slice(sectionStart, sectionEnd)
    const descriptionPattern = new RegExp(
      `data-aid=["']CONTENT_DESCRIPTION${descriptionIndex}_RENDERED["'][^>]*>([\\s\\S]*?)<\\/div>`,
      'i',
    )
    const descriptionMatch = sectionHtml.match(descriptionPattern)

    if (!descriptionMatch) {
      throw new Error('Lake Chemicals verified public job cards changed shape')
    }

    return [rawTitle, descriptionMatch[1]]
  })
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialJobSearchSignal(html)) {
    throw new Error('Lake Chemicals verified first-party job search page no longer matches the known public surface')
  }

  const jobs = extractRoleCardPairs(html).map(([rawTitle, rawDescription]) =>
    parseRoleCard(rawTitle, rawDescription),
  )

  if (jobs.length !== 6) {
    throw new Error('Lake Chemicals verified public job cards changed shape')
  }

  if (new Set(jobs.map((job) => job.jobId)).size !== jobs.length) {
    throw new Error('Lake Chemicals verified public job cards changed shape')
  }

  return jobs
}

export const createLakeChemicalsPvtLtdScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Lake Chemicals verified official homepage no longer matches the known first-party surface')
    }

    const jobSearchHtml = await fetchText(JOB_SEARCH_URL)
    const jobs = extractPublicJobs(jobSearchHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: JOB_SEARCH_URL,
      companyDomain: 'lakechemicals.com',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createLakeChemicalsPvtLtdScraper().run(options)

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
