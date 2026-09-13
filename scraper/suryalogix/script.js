import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'suryalogix'
export const COMPANY = 'SuryaLogix'
export const HOMEPAGE_URL = 'https://suryalogix.com/'
export const CAREERS_URL = 'https://suryalogix.com/career-opportunities/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&apos;|&rsquo;/gi, "'")
  .replace(/&ndash;|&mdash;/gi, '-')

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeMarkup = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/\u2019/g, "'")
    .replace(/[\u2013\u2014]/g, '-'),
)

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u2019/g, "'")
    .replace(/[\u2013\u2014]/g, '-'),
)

const defaultFetchPage = async (url, { signal } = {}) => {
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const markup = normalizeMarkup(html)
  const text = stripTags(html)

  return /<title>\s*SuryaLogix\s*\|\s*Monitoring\s*&\s*Controlling with AI\s*<\/title>/i.test(markup)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/suryalogix\.com\/["']/i.test(markup)
    && /href=["'][^"']*\/career-opportunities\/["']/i.test(markup)
    && text.includes('SMART | RELIABLE | SUSTAINABLE')
    && (
      text.includes('Smart Renewable Energy Monitoring & Control Solutions')
      || /Smart Renewable Energy monitoring\s*&\s*Control\s*Solutions/i.test(text)
    )
    && text.includes('Trusted Across 30+ Countries')
    && (
      text.includes('Welcome to SuryaLogix Innovative Energy Solutions')
      || text.includes('Engineering the Future of Renewable Intelligence')
    )
    && text.includes('sales@suryalogix.com')
  }

export const hasOfficialCareersSignal = (html) => {
  const markup = normalizeMarkup(html)
  const text = stripTags(html)

  return /<title>\s*Join SuryaLogix\s*\|\s*Renewable Energy Careers\s*&\s*Opportunities\s*<\/title>/i.test(markup)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/suryalogix\.com\/career-opportunities\/["']/i.test(markup)
    && text.includes('CAREERS AT SURYALOGIX')
    && text.includes('Work with us')
    && text.includes('More Than Just A Job')
    && text.includes('Career In Suryalogix')
    && text.includes('We Believe in People, Purpose & Progress')
    && text.includes('At SuryaLogix, we believe great work is built by great teams.')
    && text.includes('Application Form')
  }

export const hasApplicationFormSurface = (html) => {
  const text = stripTags(html)

  return text.includes('Application Form')
    && text.includes('Your name')
    && text.includes('Your email')
    && text.includes('Phone')
    && text.includes('Applying for Position of')
    && text.includes('Upload Your Resume')
    && text.includes('Your message (optional)')
  }

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bcurrent vacancies\b/i,
  /\bopen positions\b/i,
  /\bopen roles\b/i,
  /\bjob openings\b/i,
  /\bvacancies\b/i,
  /\bview details\b/i,
  /\bjob description\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /darwinbox/i,
  /recruitcrm/i,
  /zohorecruit/i,
  /linkedin\.com\/jobs/i,
  /\/jobs\//i,
]

export const hasUnexpectedPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalizeMarkup(
    String(html ?? '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' '),
  )))

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const extractPublicOpenings = (html) => {
  const jobsByTitle = new Map()
  const sections = String(html ?? '').split(
    /<section\b[^>]*class=["'][^"']*elementor-inner-section[^"']*["'][^>]*>/i,
  )

  for (const section of sections) {
    const text = stripTags(section)
    if (!/\bOpenings:/i.test(text)) continue

    const title = stripTags(section.match(/<h2\b[^>]*class=["'][^"']*elementor-heading-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1])
    const locationAndExperience = stripTags(
      section.match(/<span\b[^>]*class=["'][^"']*elementor-icon-list-text[^"']*["'][^>]*>([\s\S]*?Experience:[\s\S]*?)<\/span>/i)?.[1],
    )
    const location = locationAndExperience.match(/^(.+?)\s+Experience:/i)?.[1]?.trim()
    const experienceRequired = locationAndExperience.match(/Experience:\s*(.+)$/i)?.[1]?.trim()
    const expertise = text.match(/Expertise\s*-\s*(.+?)\s+Openings:/i)?.[1]?.trim()
    const openings = text.match(/Openings:\s*(\d+)/i)?.[1]

    if (!title || !location || !experienceRequired || !expertise || !Number(openings) || !/href=["']#form["'][\s\S]*?Apply Now/i.test(section)) throw new Error('SuryaLogix incomplete listing: malformed opening')
    if (!/^(?:Pune,\s*Maharashtra(?:,\s*India)?|.+,\s*India)$/i.test(location)) throw new Error('SuryaLogix opening location does not prove India scope')
    if (jobsByTitle.has(title)) throw new Error('SuryaLogix incomplete listing: duplicate opening')
    const jobId = slugify(title)
    jobsByTitle.set(title, {
      title,
      company: COMPANY,
      department: null,
      location: /\bindia\b/i.test(location) ? location : `${location}, India`,
      city: location.split(',')[0].trim(),
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: `${CAREERS_URL}#form`,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: expertise.split(',').map((skill) => skill.trim()).filter(Boolean),
      postingDate: null,
      closingDate: null,
      jobDescription: `${title}. Experience: ${experienceRequired}. Expertise: ${expertise}. Openings: ${openings}.`,
      source: SOURCE,
      link: `${CAREERS_URL}#form`,
    })
  }

  if ((stripTags(html).match(/\bOpenings:/gi) || []).length !== jobsByTitle.size) throw new Error('SuryaLogix incomplete opening count')
  return [...jobsByTitle.values()]
}

const getWalkInDeadline = (html) => {
  const text = stripTags(html)
  if (!/Walk-In Interviews/i.test(text)) return null
  const matches = [...text.matchAll(/Dates\s+(\d{1,2})(?:st|nd|rd|th)?\s+to\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\s+Time\s+\d{1,2}:\d{2}\s*[ap]m\s+to\s+(\d{1,2}):(\d{2})\s*([ap]m)/gi)]
  if (matches.length !== 1) throw new Error('SuryaLogix walk-in deadline dates are unrecognized')
  const [, start, day, monthName, year, hour, minute, period] = matches[0]
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthName.slice(0,3).toLowerCase())
  const utcDay = new Date(Date.UTC(Number(year), month, Number(day)))
  if (month < 0 || Number(start) < 1 || Number(start) > Number(day) || utcDay.getUTCDate() !== Number(day) || Number(hour) < 1 || Number(hour) > 12 || Number(minute) > 59) throw new Error('SuryaLogix invalid event deadline date')
  const closingDate = utcDay.toISOString().slice(0,10)
  const localHour = Number(hour) % 12 + (period.toLowerCase() === 'pm' ? 12 : 0)
  return { closingDate, timestamp: Date.parse(closingDate + 'T' + String(localHour).padStart(2,'0') + ':' + minute + ':00+05:30') }
}

export const createSuryaLogixScraper = () => ({
  async run({ fetchPage = defaultFetchPage, signal, now = () => new Date().toISOString() } = {}) {
    signal?.throwIfAborted()
    const homepage = await fetchPage(HOMEPAGE_URL, { signal })
    signal?.throwIfAborted()

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('SuryaLogix verified official homepage no longer matches the verified first-party surface')
    }

    const careersPage = await fetchPage(CAREERS_URL, { signal })
    signal?.throwIfAborted()

    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('SuryaLogix verified official careers page no longer matches the verified first-party surface')
    }

    if (!hasApplicationFormSurface(careersPage.html)) {
      throw new Error('SuryaLogix careers page no longer matches the verified non-listing application form surface')
    }

    if (!hasUnexpectedPublicJobsSignal(careersPage.html)) throw new Error('SuryaLogix application form does not prove a complete job inventory')
    const visibleMarkup = String(careersPage.html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    const links = [...visibleMarkup.matchAll(/href=["']([^"']+)["']/gi)].map(match => match[1])
    if (links.some(link => /\/jobs\/|lever\.co|greenhouse\.io|ashbyhq|workdayjobs|smartrecruiters|darwinbox|zohorecruit|turbohire|linkedin\.com\/jobs/i.test(link))) throw new Error('SuryaLogix incomplete listing: unexpected public hiring handoff')
    const jobs = extractPublicOpenings(careersPage.html)
    if (jobs.length === 0) {
      throw new Error('SuryaLogix public jobs are present but could not be parsed completely')
    }
    const scrapedAt = now()
    const deadline = getWalkInDeadline(careersPage.html)
    if (!Number.isFinite(Date.parse(scrapedAt))) throw new Error('SuryaLogix invalid observation date')
    if (deadline && Date.parse(scrapedAt) > deadline.timestamp) return []
    return jobs.map((job) => ({ ...job, closingDate: deadline?.closingDate || null, scrapedAt }))
  },
})

export const run = async (options = {}) => createSuryaLogixScraper().run(options)

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
