import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://www.verteil.com/career'

const COMPANY = 'Verteil Technologies'
const SOURCE = 'verteiltechnologies'

const normalizeText = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const slugify = (value) => normalizeText(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const getLocationData = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  if (/kochi\s*-\s*kerala/i.test(normalized)) {
    return {
      location: 'Kochi, Kerala, India',
      city: 'Kochi',
      country: 'India',
    }
  }

  if (/india/i.test(normalized)) {
    return {
      location: 'India',
      city: null,
      country: 'India',
    }
  }

  return {
    location: normalized,
    city: null,
    country: null,
  }
}

const getEmploymentType = (value) => (/hybrid/i.test(String(value ?? '')) ? 'Hybrid' : null)

const getDepartment = (value) => (/non[-\s]*engineering/i.test(String(value ?? '')) ? 'Non Engineering' : null)

const getTitle = (value) => normalizeText(String(value ?? '')
  .replace(/\bNon[-\s]*Engineering\b/gi, ' ')
  .replace(/\bHybrid\s*-\s*India\b/gi, ' ')
  .replace(/\bHybrid\b/gi, ' ')
  .replace(/\bKochi\s*-\s*Kerala\b/gi, ' ')
  .replace(/\s*-\s*India\b/gi, ' ')
  .replace(/\s+/g, ' ')
  .replace(/\s+-\s+$/g, ' ')
)

const getJobId = (applyUrl, title) => {
  try {
    const jobId = new URL(applyUrl).searchParams.get('job')
    if (jobId) return jobId
  } catch {
    // Fall back to a stable slug when the public apply URL shape changes.
  }

  return `${SOURCE}-${slugify(title)}`
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return (
    /we'?re hiring/i.test(page)
      && /open positions/i.test(page)
      && /ta@verteil\.com/i.test(page)
      && /recruitcareers\.zappyhire\.com\/en\/Verteil\/apply\?job=/i.test(page)
  ) || (
    /<title>\s*careers\s*\|\s*verteil\s*<\/title>/i.test(page)
      && /Join our movement to revolutionize the Airline retailing domain/i.test(page)
      && /recruitcareers\.zappyhire\.com\/en\/Verteil\/apply\?job=/i.test(page)
  )
}

export const extractJobCards = (html) => [...String(html ?? '').matchAll(
  /<a\b[^>]*\bhref=["'](https:\/\/recruitcareers\.zappyhire\.com\/en\/Verteil\/apply\?job=\d+)["'][^>]*>\s*([\s\S]*?)\s*<\/a>/gi,
)]
  .map((match) => {
    const [, applyUrl, rawLabel] = match
    const label = normalizeText(rawLabel)
    const title = getTitle(label)
    const locationData = getLocationData(label)

    if (!label || !title) return null

    return {
      title,
      company: COMPANY,
      department: getDepartment(label),
      location: locationData.location,
      city: locationData.city,
      country: locationData.country || 'India',
      jobId: getJobId(applyUrl, title),
      requisitionId: getJobId(applyUrl, title),
      sourceUrl: CAREERS_URL,
      applyUrl,
      employmentType: getEmploymentType(label),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobverifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createVerteilTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('Verteil Technologies official careers surface changed; refusing to scrape')
    }

    return extractJobCards(html).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createVerteilTechnologiesScraper().run(options)

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Verteil Technologies scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
