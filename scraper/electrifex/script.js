import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.electrifex.com/'
export const CAREERS_URL = 'https://talents.electrifex.com/'

const SOURCE = 'electrifex'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value, base = CAREERS_URL) => {
  if (!value) return null
  try {
    return new URL(value, base).toString()
  } catch {
    return null
  }
}

const isGenericHeading = (value) => /^(Recruitment Drive 2026|Job Openings|Apply Now|Login|Register)$/i.test(value)

const inferExperienceRequired = (title) => {
  if (/^Fresher\b/i.test(title)) return 'Fresher'
  if (/^Experienced\b/i.test(title)) return 'Experienced'
  return null
}

const extractTitleFromBlock = (block) => {
  const candidates = [...String(block ?? '').matchAll(/<(h[1-6]|strong|b|div|span|p)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => normalizeWhitespace(match[2]))
    .filter(Boolean)
    .filter((value) => !isGenericHeading(value))

  const roleLike = candidates.filter((value) => /Engineer|Developer|Architect|Intern|QA|DevOps|Content Creator|HR/i.test(value))
  return roleLike.at(-1) || candidates.at(-1) || null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const hasLegacyHomepageMarkers = /Electrifex/i.test(page)
    && /innovative solutions for automotive, embedded, and cloud technologies/i.test(page)
    && /talents\.electrifex\.com/i.test(page)
  const hasSpaHomepageShell = /<title>\s*Electrifex\s*<\/title>/i.test(page)
    && /Electrifex:\s*Engineering innovative solutions for automotive, embedded, and cloud technologies/i.test(page)
    && /<div[^>]+id=["']root["'][^>]*>/i.test(page)
    && /\/assets\/index-[^"']+\.(?:js|css)/i.test(page)

  return hasLegacyHomepageMarkers || hasSpaHomepageShell
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Electrifex\s*\|\s*Career\s*\|\s*Online Registration\s*\|\s*Join Us/i.test(page)
    && /Recruitment Drive 2026/i.test(page)
    && /Job Openings/i.test(page)
    && /registration_form\/\d+/i.test(page)
}

export const extractJobs = (html) => {
  const jobs = []
  const source = String(html ?? '')

  for (const match of source.matchAll(/<a[^>]+href=["']([^"']*\/registration_form\/(\d+))["'][^>]*>\s*Apply Now\s*<\/a>/gi)) {
    const applyUrl = toAbsoluteUrl(match[1])
    const jobId = match[2]
    const prefix = source.slice(Math.max(0, match.index - 1200), match.index)
    const title = extractTitleFromBlock(prefix)

    if (!title || !applyUrl || !jobId) continue

    jobs.push({
      title,
      company: 'Electrifex',
      location: 'India',
      city: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl,
      employmentType: null,
      experienceRequired: inferExperienceRequired(title),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    })
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createElectrifexScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Electrifex homepage no longer matches the verified official public site')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Electrifex careers page no longer matches the verified official public jobs surface')
    }

    return extractJobs(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createElectrifexScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Electrifex scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
