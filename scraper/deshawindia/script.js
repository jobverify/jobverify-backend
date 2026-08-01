import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREERS_URL = 'https://www.deshawindia.com/careers'

const OFFICE_NAMES = {
  HYD: 'Hyderabad',
  BLR: 'Bengaluru',
  GGM: 'Gurugram',
}

const normalizeText = (value) => {
  const normalized = String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const formatLocation = (value) => {
  const offices = normalizeText(value)
    ?.split('/')
    .map((office) => OFFICE_NAMES[office.trim()] || office.trim())
    .filter(Boolean)

  return offices?.length ? `${offices.join(', ')}, India` : null
}

export const extractCareerListings = (html) => [...String(html ?? '').matchAll(
  /<div\b(?=[^>]*\bclass=["'][^"']*\bjob\b[^"']*["'])(?=[^>]*\bdata-job-id=["']([^"']+)["'])[^>]*>[\s\S]*?<p\b[^>]*\bclass=["'][^"']*\bcategory\b[^"']*["'][^>]*>([\s\S]*?)<\/p>[\s\S]*?<span\b[^>]*\bclass=["'][^"']*\blocation\b[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>[\s\S]*?<span\b[^>]*\bclass=["'][^"']*\bjob-display-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
)].map((match) => {
  const [, jobId, department, officeCodes, href, title] = match
  const normalizedTitle = normalizeText(title)
  const normalizedDepartment = normalizeText(department)
  const location = formatLocation(officeCodes)
  const sourceUrl = new URL(href, CAREERS_URL).toString()

  if (!jobId || !normalizedTitle || !normalizedDepartment || !location) return null

  return {
    title: normalizedTitle,
    company: 'D. E. Shaw India',
    department: normalizedDepartment,
    location,
    city: null,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
  }
}).filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'deshawindia',
  timeoutMs: 15000,
})

export const createDeShawScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    return extractCareerListings(html).map((job) => ({
      ...job,
      source: 'deshawindia',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createDeShawScraper().run()
