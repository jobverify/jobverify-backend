import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://cyberwarfare.live/careers/'
const APPLICATION_EMAIL = 'career@cyberwarfare.live'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")

const normalizeText = (value) => {
  const text = decodeHtml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text || null
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const getEmploymentType = (joining) => /\bintern\b/i.test(joining || '')
  ? 'Internship'
  : /\bfull\s*time\b/i.test(joining || '')
    ? 'Full-time'
    : null

const getApplicationEmail = (section) => {
  const mailto = section.match(/href=["']mailto:([^?"']+)/i)?.[1]
  return decodeURIComponent(mailto || APPLICATION_EMAIL)
}

const getDescription = (section) => {
  const description = normalizeText(section.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1])
  const applicationEmail = getApplicationEmail(section)
  return [description, `Apply by email: ${applicationEmail}`].filter(Boolean).join(' ')
}

export const extractCareerJobs = (html) => [...String(html ?? '').matchAll(
  /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|$)/gi,
)]
  .map((match) => {
    const title = normalizeText(match[1])
    const section = match[2]
    const locationMatch = normalizeText(section.match(/Location\s*:\s*([^<\n]+)/i)?.[1])
    const joining = normalizeText(section.match(/Joining\s*:\s*([^<\n]+)/i)?.[1])
    const jobId = `cyberwarfarelabs-${slugify(title)}`

    if (!title || !locationMatch || !jobId) return null

    return {
      title,
      company: 'CyberWarFare Labs',
      department: null,
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: getEmploymentType(joining),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: getDescription(section),
      remoteStatus: /on[\s-]?site/i.test(locationMatch) ? 'On-site' : null,
      compensation: null,
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cyberwarfarelabs',
  timeoutMs: 15000,
})

export const createCyberWarfareLabsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const jobs = extractCareerJobs(await fetchText(CAREERS_URL))

    if (jobs.length === 0) {
      throw new Error('CyberWarFare Labs careers page no longer exposes the expected job listings')
    }

    return jobs.map((job) => ({
      ...job,
      source: 'cyberwarfarelabs',
      link: CAREERS_URL,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createCyberWarfareLabsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total India jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'cyberwarfarelabs')
}
