import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'astronics'
export const COMPANY = 'Astronics Test Systems'
export const HOMEPAGE_URL = 'https://www.diagnosys.com/'
export const CAREERS_URL = 'https://www.astronics.com/careers'
export const JOBS_URL = 'https://www.astronics.com/us-jobs'
export const APPONE_URL = 'https://www2.appone.com/Search/Search.aspx?ServerVar=astronics.appone.com'
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATION_PATTERNS = [
  /\bindia\b/i,
  /\bbangalore\b/i,
  /\bbengaluru\b/i,
  /\bkarnataka\b/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /Astronics Test Systems/i.test(page)
    && /Bangalore,\s*India/i.test(page)
    && /©\s*Astronics Test Systems/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /Astronics/i.test(page)
    && /Careers/i.test(page)
    && /\/us-jobs\b/i.test(page)
}

export const extractJobsPageUrl = (html) => {
  const match = String(html ?? '').match(/<a[^>]+href=["']([^"']*\/us-jobs[^"']*)["'][^>]*>/i)

  if (!match) return null

  try {
    return new URL(match[1], CAREERS_URL).toString()
  } catch {
    return null
  }
}

export const extractEmbeddedJobsUrl = (html) => {
  const match = String(html ?? '').match(
    /<iframe[^>]+(?:data-src|src)=["'](https:\/\/www2\.appone\.com\/Search\/Search\.aspx\?ServerVar=astronics\.appone\.com)["']/i,
  )

  return match?.[1] ?? null
}

export const hasOfficialJobsPageSignal = (html) => {
  const page = String(html ?? '')

  return (
    /Search U\.S\. Jobs/i.test(page)
    && /Astronics/i.test(page)
    && extractEmbeddedJobsUrl(page) !== null
  ) || hasCountryLimitedJobsPageWithoutIndia(page)
}

export const hasCountryLimitedJobsPageWithoutIndia = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page.replace(/<[^>]+>/g, ' '))

  return /<title>\s*Astronics Jobs in the United States\s*<\/title>/i.test(page)
    && /Astronics Career Search/i.test(text)
    && /United States/i.test(text)
    && /current job openings for all locations in the United States/i.test(text)
    && /Search for Jobs in Canada/i.test(text)
    && /Search for Jobs in France/i.test(text)
    && !hasIndiaLocationOptions([{ label: text }])
}

export const extractLocationOptions = (html) => {
  const selectMatch = String(html ?? '').match(
    /<select[^>]+name=["']LocationID["'][^>]*>([\s\S]*?)<\/select>/i,
  )

  if (!selectMatch) return []

  return [...selectMatch[1].matchAll(/<option[^>]*value=["']?([^"'>\s]+)[^>]*>([\s\S]*?)<\/option>/gi)]
    .map(([, value, label]) => ({
      value: normalizeWhitespace(value),
      label: normalizeWhitespace(label.replace(/<[^>]+>/g, ' ')),
    }))
    .filter((option) => option.value && option.value !== '0' && option.label)
}

export const hasIndiaLocationOptions = (options = []) => options.some((option) =>
  INDIA_LOCATION_PATTERNS.some((pattern) => pattern.test(option?.label ?? '')))

export const hasVerifiedApponeLandingPage = (html) => {
  const page = String(html ?? '')
  const locationOptions = extractLocationOptions(page)

  return /<title>\s*Astronics Jobs\s*<\/title>/i.test(page)
    && /myStaffingPro Applicant Tracking System/i.test(page)
    && /name=["']ServerVar["'][^>]+value=["']astronics\.appone\.com["']/i.test(page)
    && locationOptions.length > 0
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createAstronicsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Astronics verified Diagnosys homepage no longer matches the trusted first-party bridge')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Astronics verified Astronics careers page no longer matches the trusted public surface')
    }

    const jobsPageUrl = extractJobsPageUrl(careersHtml)
    if (jobsPageUrl !== JOBS_URL) {
      throw new Error('Astronics careers page no longer links to the verified jobs landing page')
    }

    const jobsHtml = await fetchText(JOBS_URL)
    if (!hasOfficialJobsPageSignal(jobsHtml)) {
      throw new Error('Astronics verified jobs landing page no longer matches the trusted public surface')
    }

    const embeddedJobsUrl = extractEmbeddedJobsUrl(jobsHtml)
    if (!embeddedJobsUrl && hasCountryLimitedJobsPageWithoutIndia(jobsHtml)) {
      return []
    }

    if (embeddedJobsUrl !== APPONE_URL) {
      throw new Error('Astronics jobs landing page no longer exposes the verified AppOne board')
    }

    const apponeLandingPage = await fetchText(APPONE_URL)
    if (!hasVerifiedApponeLandingPage(apponeLandingPage)) {
      throw new Error('Astronics verified public AppOne board no longer matches the trusted public surface')
    }

    const locationOptions = extractLocationOptions(apponeLandingPage)
    if (hasIndiaLocationOptions(locationOptions)) {
      throw new Error('Astronics public AppOne board now exposes India locations')
    }

    return []
  },
})

export const run = async (options = {}) => createAstronicsScraper().run(options)

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
