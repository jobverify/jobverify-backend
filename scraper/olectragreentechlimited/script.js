import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'olectragreentechlimited'
export const COMPANY = 'Olectra Greentech Limited'
export const HOMEPAGE_URL = 'https://olectra.com/'
export const JOB_OPENINGS_URL = 'https://olectra.com/job-openings/'
export const SUBMIT_RESUME_URL = 'https://olectra.com/submit-resume/'
export const APPLY_URL = 'https://olectra.com/job-openings/submit-resume'
export const COMPANY_DOMAIN = 'olectra.com'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_ERROR =
  'Olectra verified official homepage no longer matches the trusted first-party surface'
const JOB_OPENINGS_ERROR =
  'Olectra verified public job openings page no longer matches the trusted first-party surface'
const SUBMIT_RESUME_ERROR =
  'Olectra verified submit-resume form no longer matches the trusted first-party surface'
const JOB_CARD_ERROR =
  'Olectra verified public job cards changed shape'

const EXPECTED_TITLES = [
  'Engineer / Sr. Engineer - R&D Project Management',
  'Engineer / Sr. Engineer - R&D Proto Development',
  'Engineer/ Sr. Engineer - R&D Cabin & Load Body',
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;|&#x2013;/gi, '-')
  .replace(/&mdash;|&#8212;|&#x2014;/gi, '-')
  .replace(/[–—−]/g, '-')
  .replace(/[â€“â€”]/g, '-')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const htmlToLines = (html) => decodeHtmlEntities(
  String(html ?? '')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|h[1-6]|a|span|strong|em|ul|ol)>/gi, '\n')
    .replace(/<(p|div|section|h[1-6]|a|span|strong|em|ul|ol)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' '),
)
  .replace(/\r/g, '')
  .split('\n')
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean)

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/['"]/g, '')
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

const getLineValue = (lines, label) => {
  const line = lines.find((entry) => new RegExp(`^${label}:`, 'i').test(entry))
  return line ? normalizeWhitespace(line.replace(new RegExp(`^${label}:`, 'i'), '')) : null
}

const getSkills = (lines) => {
  const startIndex = lines.findIndex((line) => /^Skills and Knowledge:/i.test(line))
  if (startIndex === -1) return []

  const skills = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (
      /^Competencies/i.test(line)
      || /^Apply now$/i.test(line)
      || /^Education:/i.test(line)
      || /^Experience:/i.test(line)
    ) {
      break
    }

    skills.push(line)
  }

  return skills.filter(Boolean)
}

const extractPanelSections = (html) => {
  const page = String(html ?? '')
  const headingMatches = [...page.matchAll(/<div class="fusion-toggle-heading">\s*([\s\S]*?)\s*<\/div>/gi)]

  if (headingMatches.length !== EXPECTED_TITLES.length) {
    throw new Error(JOB_CARD_ERROR)
  }

  return headingMatches.map((match, index) => {
    const title = normalizeWhitespace(stripTags(match[1]))
    const sectionStart = match.index ?? 0
    const sectionEnd = headingMatches[index + 1]?.index ?? page.length
    const sectionHtml = page.slice(sectionStart, sectionEnd)
    const applyUrl = sectionHtml.match(
      /<a[^>]+href="([^"]+)"[^>]*>\s*<span[^>]*>\s*Apply now\s*<\/span>\s*<\/a>/i,
    )?.[1]

    if (!title || !applyUrl) {
      throw new Error(JOB_CARD_ERROR)
    }

    return {
      title,
      sectionHtml,
      applyUrl,
    }
  })
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Home\s*-\s*olectra\s*<\/title>/i.test(page)
    && /Olectra Greentech Ltd is pioneer in electric bus manufacturing/i.test(text)
    && /building the Power Transmission and distribution in India/i.test(text)
    && /href=["'](?:https:\/\/olectra\.com\/)?job-openings\/?["']/i.test(page)
    && /href=["'](?:https:\/\/olectra\.com\/)?submit-resume\/?["']/i.test(page)
    && /Olectra Greentech Limited\./i.test(text)
}

export const hasOfficialJobOpeningsSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Job Openings\s*-\s*olectra\s*<\/title>/i.test(page)
    && /Job Openings/i.test(text)
    && /Submit Resume/i.test(text)
    && /Apply now/i.test(text)
    && /fusion-toggle-heading/i.test(page)
}

export const hasOfficialSubmitResumeSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Submit Resume\s*-\s*olectra\s*<\/title>/i.test(page)
    && /class="wpcf7-form/i.test(page)
    && /placeholder="Full name"/i.test(page)
    && /placeholder="Applying for"/i.test(page)
    && /name="functional-area"/i.test(page)
    && /name="yeas-of-experience"/i.test(page)
    && /Upload resume/i.test(text)
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialJobOpeningsSignal(html)) {
    throw new Error(JOB_OPENINGS_ERROR)
  }

  const panels = extractPanelSections(html)

  if (panels.some((panel, index) => panel.title !== EXPECTED_TITLES[index])) {
    throw new Error(JOB_CARD_ERROR)
  }

  return panels.map((panel) => {
    if (panel.applyUrl !== APPLY_URL) {
      throw new Error(JOB_CARD_ERROR)
    }

    const lines = htmlToLines(panel.sectionHtml)
    const minimumQualification = getLineValue(lines, 'Education')
    const experienceRequired = getLineValue(lines, 'Experience')
    const requiredSkills = getSkills(lines)
    const jobId = `${SOURCE}-${slugify(panel.title)}`

    if (!minimumQualification || !experienceRequired || requiredSkills.length === 0) {
      throw new Error(JOB_CARD_ERROR)
    }

    return {
      title: panel.title,
      company: COMPANY,
      department: 'R&D',
      location: null,
      city: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: `${JOB_OPENINGS_URL}#${jobId}`,
      applyUrl: panel.applyUrl,
      employmentType: null,
      workplaceType: null,
      experienceRequired,
      minimumQualification,
      preferredQualification: null,
      requiredSkills,
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeWhitespace(
        `Education: ${minimumQualification}. `
          + `Experience: ${experienceRequired}. `
          + `Skills: ${requiredSkills.join('; ')}. `
          + 'Apply via the official Olectra first-party resume page.',
      ),
    }
  })
}

export const createOlectraGreentechLimitedScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error(HOMEPAGE_ERROR)
    }

    const jobOpeningsHtml = await fetchText(JOB_OPENINGS_URL)
    const jobs = extractPublicJobs(jobOpeningsHtml)

    const submitResumeHtml = await fetchText(SUBMIT_RESUME_URL)
    if (!hasOfficialSubmitResumeSignal(submitResumeHtml)) {
      throw new Error(SUBMIT_RESUME_ERROR)
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: JOB_OPENINGS_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createOlectraGreentechLimitedScraper().run(options)

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
