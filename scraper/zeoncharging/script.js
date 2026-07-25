import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'zeoncharging'
export const COMPANY = 'Zeon Electric Pvt Ltd'
export const LEGACY_HOMEPAGE_URL = 'https://zeonelectric.in/'
export const HOMEPAGE_URL = 'https://zeoncharging.com/'
export const ABOUT_URL = 'https://zeoncharging.com/about_us'
export const CONTACT_URL = 'https://zeoncharging.com/contact_us'
export const CAREERS_URL = 'https://zeoncharging.com/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(value)
    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.origin}${normalizedPath}`.toLowerCase()
  } catch {
    return null
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
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
  const page = String(html ?? '')

  return /<title>\s*Zeon Charging\s*<\/title>/i.test(page)
    && /rel=["']canonical["'][^>]+href=["']https:\/\/zeoncharging\.com\/["']/i.test(page)
    && /href=["']\/about_us["']/i.test(page)
    && /href=["']\/careers["']/i.test(page)
    && /href=["']\/contact_us["']/i.test(page)
}

export const hasOfficialAboutSignal = (html) =>
  /Zeon Electric Pvt Ltd/i.test(String(html ?? ''))

export const hasOfficialContactSignal = (html) => {
  const page = String(html ?? '')
  return /care@zeoncharging\.com/i.test(page)
    && /Tiruppur/i.test(page)
    && /Tamil Nadu/i.test(page)
}

export const extractJobCards = (html) =>
  Array.from(
    String(html ?? '').matchAll(
      /<article\b[^>]*class=["'][^"']*\bposition-card\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi,
    ),
  )
    .map((match) => {
      const articleHtml = match[1]
      const title = normalizeWhitespace(
        articleHtml.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1],
      )
      const jobDescription = normalizeWhitespace(
        articleHtml.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1],
      )
      const titleSlug = slugify(title)

      if (!title || !jobDescription || !titleSlug) return null

      const jobId = `${SOURCE}-${titleSlug}`

      return {
        title,
        company: COMPANY,
        department: null,
        location: null,
        city: null,
        state: null,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: CAREERS_URL,
        applyUrl: CAREERS_URL,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription,
        remoteStatus: 'On-site',
      }
    })
    .filter(Boolean)

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Join Us/i.test(page)
    && /Open Positions/i.test(page)
    && extractJobCards(page).length > 0
}

export const createZeonChargingScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepage = await fetchPage(LEGACY_HOMEPAGE_URL)
    if (
      homepage.status !== 200
      || normalizeComparableUrl(homepage.url) !== normalizeComparableUrl(HOMEPAGE_URL)
      || !hasOfficialHomepageSignal(homepage.html)
    ) {
      throw new Error('Response is not the verified official homepage for Zeon Charging')
    }

    const aboutPage = await fetchPage(ABOUT_URL)
    if (aboutPage.status !== 200 || !hasOfficialAboutSignal(aboutPage.html)) {
      throw new Error('Response is not the verified legal-name about page for Zeon Charging')
    }

    const contactPage = await fetchPage(CONTACT_URL)
    if (contactPage.status !== 200 || !hasOfficialContactSignal(contactPage.html)) {
      throw new Error('Response is not the verified official contact page for Zeon Charging')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Response is not the verified official careers page for Zeon Charging')
    }

    const jobs = extractJobCards(careersPage.html)
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createZeonChargingScraper().run(options)

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
