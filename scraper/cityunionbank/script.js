import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGES = [
  {
    jobId: 'careers-bank',
    title: 'Banking Cadres',
    sourceUrl: 'https://cityunionbank.bank.in/careers-bank',
  },
  {
    jobId: 'careers-bm-am',
    title: 'Branch and Deputy Manager Cadres',
    sourceUrl: 'https://cityunionbank.bank.in/careers-bm-am',
  },
]

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractApplyUrl = (html) => {
  const match = String(html).match(/href=["'](https?:\/\/(?:www\.)?(?:zfrmz\.com|forms\.zohopublic\.com)\/[^"']+)["']/i)
  return match ? match[1] : null
}

const extractJobDescription = (html) => {
  const match = String(html).match(/WE ARE (?:LOOKING|HIRING) FOR[\s\S]*?(?=Last Updated on:)/i)
  return match ? normalizeWhitespace(match[0]) : null
}

export const extractJobPosting = (html, page = {}) => {
  const jobDescription = extractJobDescription(html)
  const applyUrl = extractApplyUrl(html)

  if (!page.jobId || !page.title || !page.sourceUrl || !jobDescription || !applyUrl) {
    return null
  }

  return {
    title: page.title,
    company: 'City Union Bank',
    department: 'Banking',
    location: 'India',
    city: null,
    country: 'India',
    jobId: page.jobId,
    requisitionId: page.jobId,
    sourceUrl: page.sourceUrl,
    applyUrl,
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription,
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createCityUnionBankScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const jobs = []

    for (const page of CAREER_PAGES) {
      const job = extractJobPosting(await fetchText(page.sourceUrl), page)
      if (!job) continue

      jobs.push({
        ...job,
        source: 'cityunionbank',
        link: job.applyUrl,
        scrapedAt: new Date().toISOString(),
      })

      if (maxJobs && jobs.length >= maxJobs) break
    }

    return jobs
  },
})

export const run = async () => createCityUnionBankScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total City Union Bank jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    const result = await saveToDB(jobs, 'cityunionbank')
    console.log('DB result:', result)
    process.exit(0)
  }
}
