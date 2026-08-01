import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kekatechnologies'
export const COMPANY = 'KEKA TECHNOLOGIES'
export const CAREERS_URL = 'https://www.keka.com/careers'
export const VERIFIED_ROLE_PAGE_URLS = [
  'https://www.keka.com/careers/product-manager',
  'https://www.keka.com/careers/design-roles',
  'https://www.keka.com/marketing-roles',
]

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

export const hasOfficialCareersLandingSignal = (html) => {
  const page = String(html ?? '')
  return /Life is too short to do mediocre work/i.test(page)
    && /Join Our Team/i.test(page)
    && /hr\.keka\.com\/careers/i.test(page)
}

const inferHyderabadLocation = (text) =>
  /hyderabad/i.test(String(text ?? '')) ? 'Hyderabad, India' : 'Hyderabad, India'

const inferCity = (text) =>
  /hyderabad/i.test(String(text ?? '')) ? 'Hyderabad' : 'Hyderabad'

const inferExperience = (text) =>
  normalizeWhitespace(String(text ?? '').match(/(\d+\+?(?:-\d+)?\s+years?\s+of\s+experience)/i)?.[1] ?? null)

const inferTitle = (text) =>
  normalizeWhitespace(String(text ?? '').replace(/\s+\d+\+?(?:-\d+)?\s+years?\s+of\s+experience.*$/i, ''))

const extractDescription = (html) =>
  normalizeWhitespace(
    String(html ?? '').match(/<h1[^>]*>[\s\S]*?<\/h1>\s*<p>([\s\S]*?)<\/p>/i)?.[1] ?? null,
  )

export const extractRoleListings = (html, pageUrl) => {
  const page = String(html ?? '')
  return [...page.matchAll(/<a[^>]+href=["'](https?:\/\/hr\.keka(?:hire)?\.com[^"']+)["'][^>]*>\s*([^<]+?)\s*<\/a>/gi)]
    .map((match) => {
      const text = normalizeWhitespace(match[2])
      const title = inferTitle(text)
      const experienceRequired = inferExperience(text)
      return title
        ? {
            title,
            location: inferHyderabadLocation(text),
            city: inferCity(text),
            experienceRequired,
            applyUrl: normalizeWhitespace(match[1]),
            sourceUrl: pageUrl,
          }
        : null
    })
    .filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'kekatechnologies',
  timeoutMs: 15000,
})

export const createKekaTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const landingHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersLandingSignal(landingHtml)) {
      throw new Error('KEKA TECHNOLOGIES official careers landing no longer matches the verified first-party handoff')
    }

    const jobs = []

    for (const pageUrl of VERIFIED_ROLE_PAGE_URLS) {
      const pageHtml = await fetchText(pageUrl)
      const roles = extractRoleListings(pageHtml, pageUrl)
      for (const role of roles) {
        jobs.push({
          title: role.title,
          company: COMPANY,
          location: role.location,
          city: role.city,
          country: 'India',
          jobId: role.applyUrl.split('/').filter(Boolean).pop() || role.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          requisitionId: role.applyUrl.split('/').filter(Boolean).pop() || null,
          sourceUrl: role.sourceUrl,
          applyUrl: role.applyUrl,
          link: role.applyUrl,
          source: SOURCE,
          employmentType: null,
          experienceRequired: role.experienceRequired,
          department: null,
          jobDescription: extractDescription(pageHtml),
          minimumQualification: null,
          preferredQualification: null,
          requiredSkills: [],
          postingDate: null,
          closingDate: null,
          scrapedAt: now(),
        })
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createKekaTechnologiesScraper().run(options)

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
