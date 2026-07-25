import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kgisl'
export const COMPANY = 'KGISL'
export const HOMEPAGE_URL = 'https://www.kgisl.com/'
export const CAREERS_URL = 'https://www.kgisl.com/careers'
export const CURRENT_OPENINGS_URL = 'https://www.kgisl.com/current-openings/'
export const CANDIDATE_HOME_URL = 'https://careerxai.kgisl.com/ajax/candidate_home?form=wepportal'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_SIGNALS = [
  'AI & ML driven Insurance & capital market products | Digital Transformation',
  'Get Your Workforce Ready for The Future',
  'Powered by Empathy',
  'Experienced by Outcomes',
  'A closer look at who we are and our values',
  'Careers',
]

const CAREERS_SIGNALS = [
  'Career Opportunities - KGiSL Technologies',
  'Join our talent network',
  'Current Openings',
  'Register on our Candidate Portal and get notified when new roles that match your skills open up.',
  'tag@kgisl.com',
]

const CURRENT_OPENINGS_SIGNALS = [
  'Career opportunities | KGiSL Technologies',
  'Current Openings',
  'careerxai.kgisl.com/ajax/candidate_home?form=wepportal',
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\r\n?/g, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
  .replace(/[“”]/g, '"')
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toLowerText = (value) => normalizeWhitespace(value).toLowerCase()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractBlock = (html, startIndex) => {
  let depth = 0
  let cursor = startIndex

  while (cursor < html.length) {
    const nextOpen = html.indexOf('<div', cursor)
    const nextClose = html.indexOf('</div>', cursor)

    if (nextClose === -1) return null

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1
      cursor = nextOpen + 4
      continue
    }

    depth -= 1
    cursor = nextClose + 6

    if (depth === 0) {
      return html.slice(startIndex, cursor)
    }
  }

  return null
}

export const hasOfficialHomepageSignal = (html) => {
  const normalized = toLowerText(html)
  return HOMEPAGE_SIGNALS.every((signal) => normalized.includes(signal.toLowerCase()))
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = toLowerText(html)
  return CAREERS_SIGNALS.every((signal) => normalized.includes(signal.toLowerCase()))
}

export const hasOfficialCurrentOpeningsSignal = (html) => {
  const normalized = toLowerText(html)

  return normalized.includes('career opportunities | kgisl technologies')
    && normalized.includes('current openings')
}

export const extractCandidateHomeUrl = (html) => {
  const match = String(html ?? '').match(/<iframe[^>]+src="([^"]*candidate_home\?form=wepportal[^"]*)"[^>]*>/i)
  return toAbsoluteUrl(match?.[1] ?? null, CURRENT_OPENINGS_URL)
}

export const extractJobs = (html) => {
  const source = String(html ?? '')
  const jobs = []
  const starts = [...source.matchAll(/<div class="job-card">/gi)]

  for (const start of starts) {
    const card = extractBlock(source, start.index)
    if (!card) continue

    const jobId = normalizeWhitespace(card.match(/Vacancy ID:\s*([^<\n]+)/i)?.[1] ?? '')
    const title = normalizeWhitespace(card.match(/<div class="job-title toggle-description">([\s\S]*?)<\/div>/i)?.[1] ?? '')
    const location = normalizeWhitespace(card.match(/<div class="location mb-1">([\s\S]*?)<\/div>/i)?.[1] ?? '')
    const applyUrl = toAbsoluteUrl(
      card.match(/<a href="([^"]+)"\s*class="btn apply-btn/i)?.[1] ?? null,
      CANDIDATE_HOME_URL,
    )
    const postingDate = normalizeWhitespace(card.match(/Posted on:\s*([^<\n]+)/i)?.[1] ?? '')
    const jobDescription = normalizeWhitespace(
      card.match(/<div class="job-description">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<div class="col-md-3">/i)?.[1]
      ?? card.match(/<div class="job-description">([\s\S]*?)<\/div>/i)?.[1]
      ?? '',
    )

    if (!jobId || !title || !location || !applyUrl || !jobDescription) {
      continue
    }

    jobs.push({
      title,
      location,
      jobId,
      applyUrl,
      sourceUrl: applyUrl,
      postingDate,
      jobDescription,
    })
  }

  return jobs
}

export const createKgislScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('KGISL verified official homepage no longer matches the known public surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('KGISL verified official careers page no longer matches the known public surface')
    }

    const currentOpeningsHtml = await fetchText(CURRENT_OPENINGS_URL)
    if (!hasOfficialCurrentOpeningsSignal(currentOpeningsHtml)) {
      throw new Error('KGISL verified current openings page no longer matches the known public surface')
    }

    const candidateHomeUrl = extractCandidateHomeUrl(currentOpeningsHtml)
    if (candidateHomeUrl !== CANDIDATE_HOME_URL) {
      throw new Error('KGISL current openings page no longer links to the verified candidate portal')
    }

    const candidateHomeHtml = await fetchText(CANDIDATE_HOME_URL)
    const extractedJobs = extractJobs(candidateHomeHtml)

    if (extractedJobs.length === 0) {
      throw new Error('KGISL candidate portal no longer exposes the verified public job cards')
    }

    return extractedJobs.map((job) => normalizeScrapedJob({
      ...job,
      company: COMPANY,
      companyCareerPage: CURRENT_OPENINGS_URL,
      atsPlatform: 'official-first-party-candidate-portal',
    }, {
      companyName: COMPANY,
      companyCareerPage: CURRENT_OPENINGS_URL,
      companyDomain: 'kgisl.com',
      atsPlatform: 'official-first-party-candidate-portal',
      countryFilter: 'India',
    }))
  },
})

export const run = async (options = {}) => createKgislScraper().run(options)

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
