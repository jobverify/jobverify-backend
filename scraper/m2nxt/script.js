import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'm2nxt'
export const COMPANY = 'm2nxt Solutions (P) Ltd'
export const HOMEPAGE_URL = 'https://www.m2nxt.com/'
export const CAREERS_URL = 'https://www.m2nxt.com/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const DETAILED_TITLE = 'Pre Sales Mechanical Design & Estimation for Automation Solutions'
const EXPECTED_TITLES = [
  DETAILED_TITLE,
  'Robotics Team Lead Engineer',
  'Automation Controls Engineer - Lead',
  'Assistant Manager / Deputy Manager - Sales Engineering (Fixture Business)',
  'Team Lead - Mechanical Design (Industrial Automation)',
  'Trainee / Engineer - Mechanical Design',
  'Engineer - QA Software',
  'Technical Sales Engineer',
  'Engineer - Operations',
  'Fixture & Tooling Design Engineer',
  'Senior Engineer / Lead - Mechanical Design',
  'Senior Fixture Design Engineer',
  'Controls Engineer - Additive Manufacturing',
]

const APPLY_EMAIL = 'Ahalya.k@m2nxt.com'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/[\u2013\u2014\u2212]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|\/section|\/article|\/main|\/a|\/span|\/strong)\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|ul|ol|section|article|main|h[1-6]|a|span|strong)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const extractBlock = (text, startPattern, endPattern) => {
  const start = text.search(startPattern)
  if (start < 0) return null

  const sliceStart = start + text.slice(start).match(startPattern)?.[0].length
  const remainder = text.slice(sliceStart)
  const end = endPattern ? remainder.search(endPattern) : -1

  return normalizeWhitespace(end >= 0 ? remainder.slice(0, end) : remainder)
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  if (/india/i.test(normalized)) return normalized
  if (/bangalore/i.test(normalized)) return 'Bangalore, Karnataka, India'
  return `${normalized}, India`
}

const extractTechnicalSkills = (text) => normalizeWhitespace(text)
  ?.split(/\s*(?:;|\||,)\s*/g)
  .map((skill) => normalizeWhitespace(skill))
  .filter(Boolean) || []

const buildGenericJobDescription = (title) => `Open role listed on the verified m2nxt careers page: ${title}.`

const buildDetailedJob = (text) => {
  const block = extractBlock(
    text,
    new RegExp(`${DETAILED_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    new RegExp(EXPECTED_TITLES[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  ) || text

  const afterDepartment = extractBlock(block, /Department:/i, /Location:/i)
  const location = normalizeLocation(extractBlock(block, /Location:/i, /Experience:/i))
  const experienceRequired = extractBlock(block, /Experience:/i, /Job Overview:/i)
  const overview = extractBlock(block, /Job Overview:/i, /Qualifications & Skills:/i)
  const qualificationsBlock = extractBlock(block, /Qualifications & Skills:/i, /Interested candidates may drop their CVs at/i)
  const minimumQualification = extractBlock(qualificationsBlock || '', /Education:/i, /Experience:/i)
  const experienceDetails = extractBlock(qualificationsBlock || '', /Experience/i, /Technical Skills/i)
  const technicalSkills = extractTechnicalSkills(extractBlock(qualificationsBlock || '', /Technical Skills/i, null))
  const applyUrl = `mailto:${APPLY_EMAIL}`

  return {
    title: DETAILED_TITLE,
    company: COMPANY,
    department: afterDepartment || null,
    location,
    city: location?.startsWith('Bangalore') ? 'Bangalore' : null,
    country: 'India',
    jobId: `${SOURCE}-${slugify(DETAILED_TITLE)}`,
    requisitionId: `${SOURCE}-${slugify(DETAILED_TITLE)}`,
    sourceUrl: CAREERS_URL,
    applyUrl,
    employmentType: null,
    experienceRequired: experienceRequired || experienceDetails || null,
    minimumQualification: minimumQualification || null,
    preferredQualification: null,
    requiredSkills: technicalSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: [
      overview && `Job Overview: ${overview}`,
      minimumQualification && `Education: ${minimumQualification}`,
      experienceDetails && `Experience: ${experienceDetails}`,
      technicalSkills.length > 0 && `Technical Skills: ${technicalSkills.join('; ')}`,
      `Interested candidates may drop their CVs at ${APPLY_EMAIL}.`,
    ].filter(Boolean).join(' '),
    publicExperienceChecked: true,
  }
}

const buildGenericJob = (title) => ({
  title,
  company: COMPANY,
  department: null,
  location: null,
  city: null,
  country: 'India',
  jobId: `${SOURCE}-${slugify(title)}`,
  requisitionId: `${SOURCE}-${slugify(title)}`,
  sourceUrl: CAREERS_URL,
  applyUrl: null,
  employmentType: null,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription: buildGenericJobDescription(title),
  publicExperienceChecked: true,
})

export const hasOfficialHomepageSignal = (html) => {
  const text = stripTags(html).toLowerCase()

  return text.includes('m2nxt')
    && text.includes('revolutionize manufacturing with the power of smart factories')
    && text.includes('marketing@m2nxt.com')
    && /href=["']\/careers["']/i.test(String(html ?? ''))
}

export const hasOfficialCareersSignal = (html) => {
  const text = stripTags(html)

  return text.includes('Careers')
    && text.includes(DETAILED_TITLE)
    && text.includes('Job Openings')
    && text.includes(APPLY_EMAIL)
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('m2nxt Solutions (P) Ltd verified first-party careers page no longer matches the known public surface')
  }

  const normalizedText = stripTags(html)

  if (!EXPECTED_TITLES.every((title) => normalizedText.includes(title))) {
    throw new Error('m2nxt Solutions (P) Ltd verified public job titles changed on the first-party careers page')
  }

  return [
    buildDetailedJob(normalizedText),
    ...EXPECTED_TITLES.slice(1).map((title) => buildGenericJob(title)),
  ]
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createM2nxtScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('m2nxt Solutions (P) Ltd verified official homepage no longer matches the known first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractPublicJobs(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
      companyCareerPage: CAREERS_URL,
      companyDomain: 'm2nxt.com',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createM2nxtScraper().run(options)

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
