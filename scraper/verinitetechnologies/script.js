import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'verinitetechnologies'
export const COMPANY = 'Verinite Technologies'
export const COMPANY_DOMAIN = 'verinite.com'
export const CAREERS_URL = 'https://www.verinite.com/careers.html'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Verinite \| Explore World of Opportunities with Us\s*<\/title>/i.test(page)
    && /class=["']job_box["']/i.test(page)
    && /Powercard L2 Support/i.test(page)
}

export const extractJobCards = (html) => [...String(html ?? '').matchAll(
  /<div class=["']job_box["'][\s\S]*?<h5>([\s\S]*?)<\/h5>[\s\S]*?<p class=["']job_location["'][\s\S]*?<span class=["']theme_text["']>([\s\S]*?)<\/span>[\s\S]*?<span class=["']job_status["']>([\s\S]*?)<\/span>[\s\S]*?<\/p>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>[\s\S]*?<\/div>/gi,
)].map((match) => {
  const title = stripTags(match[1])
  const cityLabel = stripTags(match[2])
  const employmentType = /full\s*time/i.test(match[3]) ? 'Full-time' : stripTags(match[3]) || null
  const sourceUrl = toAbsoluteUrl(match[4])
  const jobId = sourceUrl?.split('/').pop()?.replace(/\.html$/i, '') ?? null

  return {
    title,
    company: COMPANY,
    department: null,
    location: cityLabel ? `${cityLabel}, India` : null,
    city: cityLabel.split('/')[0]?.trim() || null,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  }
}).filter((job) => job.title && job.sourceUrl && job.jobId)

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return response.text()
}

export const createVeriniteTechnologiesScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verinite careers page no longer matches the verified first-party job-card surface')
    }

    return extractJobCards(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'official-first-party-job-card-page',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createVeriniteTechnologiesScraper().run(options)

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
