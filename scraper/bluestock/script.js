import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://bluestock.in/careers/'
export const JOBS_PAGE_URL = 'https://bluestock.in/careers/jobs/'
export const COMPANY_DOMAIN = 'bluestock.in'
export const ATS_PLATFORM = 'custom-careers-pages'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

const extractFirst = (pattern, value) => normalizeWhitespace(pattern.exec(value || '')?.[1])

const slugify = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildJob = ({
  title,
  sourceUrl,
  applyUrl,
  description,
}) => ({
  title,
  company: 'Bluestock Fintech',
  department: null,
  location: null,
  city: null,
  jobId: slugify(title),
  requisitionId: null,
  sourceUrl,
  applyUrl,
  employmentType: null,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription: description,
  publicExperienceChecked: true,
  companyCareerPage: CAREER_PAGE_URL,
  companyDomain: COMPANY_DOMAIN,
  atsPlatform: ATS_PLATFORM,
})

export const extractHighlightedRoles = (html) => {
  const jobs = []
  const matches = String(html ?? '').matchAll(
    /<strong[^>]*>([^<]+)<\/strong>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?Apply Now[\s\S]*?<\/a>/gi,
  )

  for (const match of matches) {
    const title = normalizeWhitespace(match[1])
    const applyUrl = normalizeWhitespace(match[2])

    if (!title || /bluestock fintech/i.test(title)) continue

    jobs.push(buildJob({
      title,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl,
      description: 'Highlighted opening from the official Bluestock careers page.',
    }))
  }

  return jobs
}

export const extractJobCategories = (html) => {
  const jobs = []
  const matches = String(html ?? '').matchAll(
    /<div class="job-category-card"[\s\S]*?<h5>([^<]+)<\/h5>[\s\S]*?<p>[\s\S]*?(\d+\s+Job Openings)[\s\S]*?<\/p>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?View All Jobs[\s\S]*?<\/a>/gi,
  )

  for (const match of matches) {
    const title = normalizeWhitespace(match[1])
    const description = normalizeWhitespace(match[2])
    const applyUrl = normalizeWhitespace(match[3])

    if (!title) continue

    jobs.push(buildJob({
      title,
      sourceUrl: JOBS_PAGE_URL,
      applyUrl,
      description,
    }))
  }

  return jobs
}

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const run = async () => {
  const [careersHtml, jobsHtml] = await Promise.all([
    fetchText(CAREER_PAGE_URL),
    fetchText(JOBS_PAGE_URL),
  ])

  const seenJobIds = new Set()
  const jobs = [...extractHighlightedRoles(careersHtml), ...extractJobCategories(jobsHtml)]
    .filter((job) => {
      if (!job.jobId || seenJobIds.has(job.jobId)) return false
      seenJobIds.add(job.jobId)
      return true
    })
    .map((job) => ({
      ...job,
      source: 'bluestock',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))

  const maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null
  return maxJobs ? jobs.slice(0, maxJobs) : jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Bluestock scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'bluestock')
    console.log('DB result:', result)
    process.exit(0)
  }
}
