import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const VACANCIES_PAGE_URL = 'https://drdo.gov.in/drdo/en/offerings/vacancies'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const dateToIso = (value) => {
  const match = normalizeWhitespace(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null
}

const getCardValue = (cardHtml, className) => normalizeWhitespace(
  cardHtml.match(new RegExp(`<div class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, 'i'))?.[1],
)

const getLocation = (title) => {
  const match = title.match(/\b(?:at|,|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)
  const city = match?.[1] || null
  return {
    city,
    location: city ? `${city}, India` : 'India',
  }
}

const toAbsoluteUrl = (href) => {
  try {
    return new URL(href, VACANCIES_PAGE_URL).toString().replace(/^http:/i, 'https:')
  } catch {
    return null
  }
}

export const hasVacanciesPageSignal = (html) =>
  /<h1[^>]*>\s*Vacancies\s*<\/h1>|view_name\\?"?:\\?"?vacancies|vacanciess-box/i.test(String(html ?? ''))

export const extractPageUrls = (html) => [...new Set(
  [...String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']*\?page=\d+)["'][^>]*>/gi)]
    .map((match) => toAbsoluteUrl(match[1]))
    .filter(Boolean),
)]

export const extractVacancies = (html) => {
  if (!hasVacanciesPageSignal(html)) return []

  return [...String(html ?? '').matchAll(/<(?:div|article)\b[^>]*class=["'][^"']*(?:vacanciess-box|vacancy-card)[^"']*["'][^>]*>([\s\S]*?)(?=<(?:div|article)\b[^>]*class=["'][^"']*(?:vacanciess-box|vacancy-card)[^"']*["'][^>]*>|$)/gi)]
    .map((match) => {
      const cardHtml = match[1]
      const title = getCardValue(cardHtml, 'vacanciess-title')
      const requisitionId = getCardValue(cardHtml, 'vacanciess-advertisment-no-content')
      const href = cardHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*View More\s*<\/a>/i)?.[1]
      const applyUrl = toAbsoluteUrl(href)
      if (!title || !requisitionId || !applyUrl) return null

      const { city, location } = getLocation(title)
      return {
        title,
        company: 'DRDO',
        department: null,
        location,
        city,
        country: 'India',
        jobId: `drdo-${requisitionId.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()}`,
        requisitionId,
        sourceUrl: VACANCIES_PAGE_URL,
        applyUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: dateToIso(getCardValue(cardHtml, 'vacanciess-date-publish-content')),
        closingDate: dateToIso(getCardValue(cardHtml, 'vacanciess-due-date-content')),
        jobDescription: 'Official DRDO vacancy announcement. Review the official posting for eligibility and application details.',
        publicExperienceChecked: true,
      }
    })
    .filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'drdo',
  timeoutMs: 15000,
})

export const createDrdoScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const pendingUrls = [VACANCIES_PAGE_URL]
    const visitedUrls = new Set()
    const jobsById = new Map()

    while (pendingUrls.length > 0) {
      const url = pendingUrls.shift()
      if (visitedUrls.has(url)) continue
      visitedUrls.add(url)

      const html = await fetchText(url)
      if (!hasVacanciesPageSignal(html)) {
        throw new Error('DRDO vacancies page no longer exposes the expected vacancy listing')
      }

      extractVacancies(html).forEach((job) => jobsById.set(job.jobId, job))
      extractPageUrls(html).forEach((pageUrl) => {
        if (!visitedUrls.has(pageUrl)) pendingUrls.push(pageUrl)
      })
    }

    const jobs = [...jobsById.values()]
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs
    return selectedJobs.map((job) => ({
      ...job,
      source: 'drdo',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createDrdoScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'drdo')
  }
}
