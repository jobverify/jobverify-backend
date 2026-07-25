import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kumaragurucollegeoftechnology'
export const COMPANY = 'Kumaraguru College of Technology'
export const HOMEPAGE_URL = 'https://kct.ac.in/'
export const CAREERS_URL = 'https://careers.kct.ac.in/'
export const CURRENT_OPENINGS_URL = 'https://careers.kct.ac.in/current_openings.html'
export const PROFESSORS_URL = 'https://careers.kct.ac.in/professors.html'
export const OTHER_OPENINGS_URL = 'https://careers.kct.ac.in/other_openings.html'
export const DOCTORAL_FELLOWSHIP_URL = 'https://careers.kct.ac.in/doctoral_kct.html'
export const YOUNG_FACULTY_FELLOWSHIP_URL = 'https://careers.kct.ac.in/young_kct.html'
export const APPLY_URL = 'https://applyjobs.kct.ac.in/'
export const KDF_APPLY_URL = 'https://kdf.kct.ac.in/'
export const KYFF_APPLY_URL = 'https://kyf.kct.ac.in/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const LOCATION = 'Coimbatore, Tamil Nadu, India'
const CITY = 'Coimbatore'
const COUNTRY = 'India'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const cleanHeading = (value) => normalizeWhitespace(value).replace(/\s*:\s*$/, '')

const toSignalText = (html) => normalizeWhitespace(html).toLowerCase()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const ensureSentence = (value) => {
  const text = normalizeWhitespace(value)
  if (!text) return text
  return /[.!?]$/.test(text) ? text : `${text}.`
}

const createBaseJob = ({
  title,
  department,
  jobId,
  sourceUrl,
  applyUrl,
  jobDescription,
}) => ({
  title,
  company: COMPANY,
  department,
  location: LOCATION,
  city: CITY,
  country: COUNTRY,
  jobId,
  requisitionId: jobId,
  sourceUrl,
  applyUrl,
  employmentType: null,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription,
  remoteStatus: 'On-site',
})

const extractDescriptionFromBlock = (block) => {
  const listItems = [...String(block ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((item) => normalizeWhitespace(item[1]))
    .filter(Boolean)

  if (listItems.length > 0) {
    return listItems.join(' ')
  }

  return normalizeWhitespace(String(block ?? '').match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '')
}

const extractHeadingSections = (html) => {
  const source = String(html ?? '')
  const headings = [...source.matchAll(/<h([45])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => ({
    heading: cleanHeading(match[2]),
    start: match.index,
    end: match.index + match[0].length,
  }))

  return headings
    .map((item, index) => {
      const nextStart = index + 1 < headings.length ? headings[index + 1].start : source.length
      const block = source.slice(item.end, nextStart)

      return {
        heading: item.heading,
        description: extractDescriptionFromBlock(block),
      }
    })
    .filter((section) => section.heading && section.description)
}

// The live KCT faculty markup still includes one department inside an HTML comment.
const extractAcademicSections = (html) =>
  extractHeadingSections(html).filter((section) => section.heading !== 'School of Foundation Sciences')

const extractInstitutionalSections = (html) => extractHeadingSections(html)

const extractFirstParagraph = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<p class="font-p">([\s\S]*?)<\/p>/i)?.[1] ?? '')

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)

  return /<title>\s*Best Engineering College \| Kumaraguru college of technology\s*<\/title>/i.test(page)
    && text.includes('kumaraguru college of technology is the best engineering college in tamil nadu')
    && text.includes('join kct now')
    && page.includes('https://kct.ac.in/')
}

export const hasCareersLandingSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)

  return /<title>\s*Careers - KCT\s*<\/title>/i.test(page)
    && text.includes('careers @ kct')
    && text.includes('kumaraguru doctoral fellowship (kdf)')
    && text.includes('kumaraguru young faculty fellowship (kyff)')
    && /href="current_openings\.html"/i.test(page)
}

export const hasCurrentOpeningsSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)

  return text.includes('current openings')
    && text.includes('faculty recruitment')
    && text.includes('doctoral fellowship')
    && text.includes('young faculty fellowship')
    && text.includes('other openings')
}

export const hasFacultyRecruitmentSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)
  const sections = extractAcademicSections(page)
  const applyUrlMatch = page.includes(APPLY_URL) || page.includes(APPLY_URL.replace(/\/$/, ''))

  return text.includes('professors / associate professors / assistant professors')
    && text.includes('computing cluster')
    && text.includes('mba (business school)')
    && applyUrlMatch
    && sections.length >= 17
}

export const hasInstitutionalRolesSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)
  const applyUrlMatch = page.includes(APPLY_URL) || page.includes(APPLY_URL.replace(/\/$/, ''))

  return text.includes('institutional roles')
    && text.includes('associate dean - academic project management')
    && text.includes('head, centre for competitive exams')
    && applyUrlMatch
}

export const hasDoctoralFellowshipSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)

  return text.includes('kumaraguru doctoral fellowship (kdf)')
    && text.includes('full time & residential')
    && page.includes('Kumaraguru Doctoral Fellowship - KDF')
}

export const hasYoungFacultyFellowshipSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)

  return text.includes('kumaraguru young faculty fellowship (kyff)')
    && text.includes('full time & residential')
    && page.includes(KYFF_APPLY_URL)
}

export const extractAcademicJobs = (html) => {
  if (!hasFacultyRecruitmentSignal(html)) {
    throw new Error('KCT verified faculty recruitment page no longer matches the known public surface')
  }

  return extractAcademicSections(html).map(({ heading, description }) => {
    const department = heading
    const jobId = `${SOURCE}-academic-positions-${slugify(department)}`

    if (!jobId.endsWith('-')) {
      return createBaseJob({
        title: 'Academic Positions',
        department,
        jobId,
        sourceUrl: PROFESSORS_URL,
        applyUrl: APPLY_URL,
        jobDescription: `${ensureSentence(description)} Apply through the official KCT academic recruitment portal.`,
      })
    }

    throw new Error('KCT verified faculty recruitment page no longer exposes the expected academic disciplines')
  })
}

export const extractInstitutionalRoleJobs = (html) => {
  if (!hasInstitutionalRolesSignal(html)) {
    throw new Error('KCT verified institutional roles page no longer matches the known public surface')
  }

  return extractInstitutionalSections(html).map(({ heading, description }) => {
    const title = heading
    const jobId = `${SOURCE}-institutional-roles-${slugify(title)}`

    if (!jobId.endsWith('-')) {
      return createBaseJob({
        title,
        department: 'Institutional Roles',
        jobId,
        sourceUrl: OTHER_OPENINGS_URL,
        applyUrl: APPLY_URL,
        jobDescription: `${ensureSentence(description)} Apply through the official KCT careers application portal.`,
      })
    }

    throw new Error('KCT verified institutional roles page no longer exposes the expected roles')
  })
}

export const extractDoctoralFellowshipJob = (html) => {
  if (!hasDoctoralFellowshipSignal(html)) {
    throw new Error('KCT verified doctoral fellowship page no longer matches the known public surface')
  }

  const description = extractFirstParagraph(html)
  if (!description) {
    throw new Error('KCT verified doctoral fellowship page no longer exposes the public fellowship summary')
  }

  const title = 'Kumaraguru Doctoral Fellowship (KDF)'
  const jobId = `${SOURCE}-${slugify(title)}`

  return createBaseJob({
    title,
    department: 'Doctoral Fellowship',
    jobId,
    sourceUrl: DOCTORAL_FELLOWSHIP_URL,
    applyUrl: KDF_APPLY_URL,
    jobDescription: `${ensureSentence(description)} Apply through the official KDF portal.`,
  })
}

export const extractYoungFacultyFellowshipJob = (html) => {
  if (!hasYoungFacultyFellowshipSignal(html)) {
    throw new Error('KCT verified young faculty fellowship page no longer matches the known public surface')
  }

  const description = extractFirstParagraph(html)
  if (!description) {
    throw new Error('KCT verified young faculty fellowship page no longer exposes the public fellowship summary')
  }

  const title = 'Kumaraguru Young Faculty Fellowship (KYFF)'
  const jobId = `${SOURCE}-${slugify(title)}`

  return createBaseJob({
    title,
    department: 'Young Faculty Fellowship',
    jobId,
    sourceUrl: YOUNG_FACULTY_FELLOWSHIP_URL,
    applyUrl: KYFF_APPLY_URL,
    jobDescription: `${ensureSentence(description)} Apply through the official KYFF portal.`,
  })
}

const attachRunMetadata = (jobs, scrapedAt) =>
  jobs.map((job) => ({
    ...job,
    source: SOURCE,
    link: job.applyUrl || job.sourceUrl,
    scrapedAt,
    companyCareerPage: CURRENT_OPENINGS_URL,
    companyDomain: 'kct.ac.in',
    atsPlatform: 'official-company-careers',
  }))

export const createKumaraguruCollegeOfTechnologyScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('KCT verified official homepage no longer matches the known public surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasCareersLandingSignal(careersHtml)) {
      throw new Error('KCT verified careers landing page no longer matches the known public surface')
    }

    const currentOpeningsHtml = await fetchText(CURRENT_OPENINGS_URL)
    if (!hasCurrentOpeningsSignal(currentOpeningsHtml)) {
      throw new Error('KCT verified current openings page no longer matches the known public surface')
    }

    const professorsHtml = await fetchText(PROFESSORS_URL)
    const otherOpeningsHtml = await fetchText(OTHER_OPENINGS_URL)
    const doctoralHtml = await fetchText(DOCTORAL_FELLOWSHIP_URL)
    const youngHtml = await fetchText(YOUNG_FACULTY_FELLOWSHIP_URL)

    const jobs = [
      ...extractAcademicJobs(professorsHtml),
      ...extractInstitutionalRoleJobs(otherOpeningsHtml),
      extractDoctoralFellowshipJob(doctoralHtml),
      extractYoungFacultyFellowshipJob(youngHtml),
    ]

    if (jobs.length === 0) {
      throw new Error('KCT verified careers surfaces no longer expose public openings')
    }

    return attachRunMetadata(jobs, (overrideNow || now)())
  },
})

export const run = async (options = {}) => createKumaraguruCollegeOfTechnologyScraper().run(options)

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
