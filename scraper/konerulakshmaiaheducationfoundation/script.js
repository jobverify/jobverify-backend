import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'konerulakshmaiaheducationfoundation'
export const COMPANY = 'Koneru Lakshmaiah Education Foundation'
export const HOMEPAGE_URL = 'https://www.kluniversity.in/'
export const JOBS_URL = 'https://www.kluniversity.in/jobs.aspx'
export const FACULTY_CAREERS_URL = 'https://www.kluniversity.in/careers.aspx'
export const NON_TEACHING_CAREERS_URL = 'https://www.kluniversity.in/Careers-NTS.aspx'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ACADEMIC_INVITATION_TEXT =
  'Applications are invited for Academicians and Researchers for various positions in the following disciplines.'

const NON_TEACHING_DESCRIPTION =
  'Apply through the official non-teaching positions form on the KLEF careers page.'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|â€™|â€˜/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const removeHtmlComments = (html) => String(html ?? '').replace(/<!--[\s\S]*?-->/g, '')

const titleCase = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/\b([a-z])/g, (_, letter) => letter.toUpperCase())

const extractSelectMarkup = (html, selectId) =>
  String(html ?? '').match(new RegExp(`id="${selectId}"[\\s\\S]*?<\\/select>`, 'i'))?.[0] || null

const extractSelectOptions = (html, selectId) => {
  const selectMarkup = extractSelectMarkup(html, selectId)
  if (!selectMarkup) return []

  return [...selectMarkup.matchAll(/<option(?:[^>]*value="([^"]*)")?[^>]*>([\s\S]*?)<\/option>/gi)]
    .map((match) => normalizeWhitespace(match[2]))
    .filter(Boolean)
    .filter((value) => value.toLowerCase() !== 'select one')
}

const extractAcademicTableMarkup = (html) => {
  const activeHtml = removeHtmlComments(html)
  const invitationIndex = activeHtml.indexOf(ACADEMIC_INVITATION_TEXT)
  if (invitationIndex === -1) return null

  return activeHtml.slice(invitationIndex).match(/<table\b[^>]*table-bordered[^>]*>[\s\S]*?<\/table>/i)?.[0] || null
}

const extractAcademicRows = (html) => {
  const tableMarkup = extractAcademicTableMarkup(html)
  if (!tableMarkup) return []

  const rows = []
  let currentCollege = null

  for (const rowMatch of tableMarkup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = rowMatch[1]
    if (/<th\b/i.test(rowHtml)) continue

    const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((match) => normalizeWhitespace(match[1]))
      .filter(Boolean)

    if (cells.length === 2) {
      currentCollege = cells[0]
      rows.push({
        college: currentCollege,
        department: cells[1],
      })
      continue
    }

    if (cells.length === 1 && currentCollege) {
      rows.push({
        college: currentCollege,
        department: cells[0],
      })
      continue
    }

    throw new Error('KLEF verified academic careers page no longer matches the public disciplines table')
  }

  return rows
}

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
  const text = normalizeWhitespace(page)

  return /<title>\s*KL University - KLEF Deemed to be University\s*<\/title>/i.test(page)
    && text.includes('Koneru Lakshmaiah Education Foundation (KLEF) is a premier educational institution')
    && /href="jobs\.aspx"/i.test(page)
    && /href="careers\.aspx"/i.test(page)
    && /href="Careers-NTS\.aspx"/i.test(page)
}

export const hasOfficialJobsPageSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return text.includes('Careers & Academic Positions Across Multiple Disciplines')
    && text.includes(ACADEMIC_INVITATION_TEXT)
    && text.includes('careers@kluniversity.in')
    && /href="advs\.aspx"/i.test(page)
    && extractAcademicRows(html).length >= 16
}

export const extractFacultyLocations = (html) =>
  extractSelectOptions(html, 'ContentPlaceHolder1_ddlJobLocation')

export const hasFacultyCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)
  const locations = extractFacultyLocations(html)

  return text.includes('Apply Here')
    && text.includes('Upload Resume')
    && text.includes('Paper Advertisement in The Hindu')
    && /id="ContentPlaceHolder1_ddlDept"/i.test(page)
    && locations.includes('VIJAYAWADA')
    && locations.includes('HYDERABAD')
}

export const extractNonTeachingRoles = (html) =>
  extractSelectOptions(html, 'ContentPlaceHolder1_ddlPost')

export const hasNonTeachingCareersSignal = (html) => {
  const text = normalizeWhitespace(html)
  const roles = extractNonTeachingRoles(html)

  return text.includes('Apply Here')
    && text.includes('Upload Resume')
    && roles.includes('Associate Software Engineer')
    && roles.includes('Content Writer')
    && roles.includes('Network Administrator')
}

const buildAcademicLocation = (locations) => `${locations.map(titleCase).join(' / ')}, India`

export const extractAcademicJobs = ({
  jobsHtml,
  facultyCareersHtml,
} = {}) => {
  if (!hasOfficialJobsPageSignal(jobsHtml)) {
    throw new Error('KLEF verified academic careers page no longer matches the public disciplines table')
  }

  if (!hasFacultyCareersSignal(facultyCareersHtml)) {
    throw new Error('KLEF verified faculty careers page no longer matches the public application surface')
  }

  const facultyLocations = extractFacultyLocations(facultyCareersHtml)
  if (facultyLocations.length < 2) {
    throw new Error('KLEF verified faculty careers page no longer exposes the public campus locations')
  }

  const location = buildAcademicLocation(facultyLocations)

  return extractAcademicRows(jobsHtml).map(({ college, department }) => {
    const identitySlug = slugify(`academic positions ${department}`)
    if (!identitySlug) {
      throw new Error('KLEF verified academic careers page no longer matches the public disciplines table')
    }

    return {
      title: 'Academic Positions',
      company: COMPANY,
      department,
      location,
      city: null,
      country: 'India',
      jobId: `${SOURCE}-${identitySlug}`,
      requisitionId: `${SOURCE}-${identitySlug}`,
      sourceUrl: JOBS_URL,
      applyUrl: FACULTY_CAREERS_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        `Applications are invited for Academicians and Researchers for various positions in ${department} under ${college}. `
        + 'Apply through the official faculty careers form.',
      remoteStatus: 'On-site',
    }
  })
}

export const extractNonTeachingJobs = (html) => {
  if (!hasNonTeachingCareersSignal(html)) {
    throw new Error('KLEF verified non-teaching careers page no longer matches the public roles form')
  }

  const roles = extractNonTeachingRoles(html)
  if (roles.length === 0) {
    throw new Error('KLEF verified non-teaching careers page no longer matches the public roles form')
  }

  return roles.map((title) => {
    const identitySlug = slugify(`non teaching ${title}`)
    if (!identitySlug) {
      throw new Error('KLEF verified non-teaching careers page no longer matches the public roles form')
    }

    return {
      title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: `${SOURCE}-${identitySlug}`,
      requisitionId: `${SOURCE}-${identitySlug}`,
      sourceUrl: NON_TEACHING_CAREERS_URL,
      applyUrl: NON_TEACHING_CAREERS_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: NON_TEACHING_DESCRIPTION,
      remoteStatus: 'On-site',
    }
  })
}

export const extractJobs = ({
  jobsHtml,
  facultyCareersHtml,
  nonTeachingCareersHtml,
} = {}) => [
  ...extractAcademicJobs({ jobsHtml, facultyCareersHtml }),
  ...extractNonTeachingJobs(nonTeachingCareersHtml),
]

export const createKlefScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('KLEF verified official homepage no longer matches the known public surface')
    }

    const jobsHtml = await fetchText(JOBS_URL)
    const facultyCareersHtml = await fetchText(FACULTY_CAREERS_URL)
    const nonTeachingCareersHtml = await fetchText(NON_TEACHING_CAREERS_URL)

    return extractJobs({
      jobsHtml,
      facultyCareersHtml,
      nonTeachingCareersHtml,
    }).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: JOBS_URL,
      companyDomain: 'kluniversity.in',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createKlefScraper().run(options)

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
