import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'tescra'
export const COMPANY = 'TESCRA'
export const HOMEPAGE_URL = 'https://www.tescra.com/'
export const LINKEDIN_COMPANY_URL = 'https://www.linkedin.com/company/tescra'

const decodeHtml = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

const normalize = (value) => decodeHtml(value) || null

const absoluteUrl = (value) => {
  try {
    return new URL(value, LINKEDIN_COMPANY_URL).toString()
  } catch {
    return null
  }
}

const getField = (text, pattern) => normalize(text.match(pattern)?.[1])

const inferRemoteStatus = (location) => {
  if (/hybrid/i.test(location || '')) return 'Hybrid'
  if (/remote|work from home/i.test(location || '')) return 'Remote'
  return 'On-site'
}

const extractCity = (location) => {
  const normalized = normalize(location)
  if (!normalized) return null

  return normalized.split(/[/,]| - /)[0]?.trim() || null
}

const extractArticleParts = (html) => [...String(html ?? '').matchAll(
  /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
)].map((match) => {
  const block = match[0]
  const links = [...block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((link) => absoluteUrl(link[1]))
    .filter(Boolean)

  return {
    text: decodeHtml(match[1]),
    sourceUrl: links.find((link) => /linkedin\.com\/posts\//i.test(link)) || null,
    applyUrl: links.find((link) => !/linkedin\.com/i.test(link)) || null,
  }
})

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalize(html)?.toLowerCase() || ''

  return normalized.includes('tescra')
    && normalized.includes('engineering services')
    && /href=["']https:\/\/www\.tescra\.com\/careers\/["']/i.test(String(html ?? ''))
}

export const pageIndicatesTescraLinkedinCompany = (html) => {
  const normalized = normalize(html)?.toLowerCase() || ''

  return normalized.includes('tescra | linkedin')
    && normalized.includes('tescra')
    && /href=["']https:\/\/www\.tescra\.com\/["']/i.test(String(html ?? ''))
}

export const extractJobPostings = (html) => extractArticleParts(html)
  .filter(({ text, sourceUrl }) =>
    sourceUrl && /\b(hiring|job opening|job opportunity|vacancy|position\s*:)\b/i.test(text),
  )
  .map(({ text, sourceUrl, applyUrl }) => {
    const title = getField(text, /\bposition\s*:\s*(.+?)(?=\s+location\s*:|\s+employment type\s*:|$)/i)
    const rawLocation = getField(text, /\blocation\s*:\s*(.+?)(?=\s+employment type\s*:|$)/i)
    const employmentType = getField(text, /\bemployment type\s*:\s*(.+?)(?=\s+apply\b|$)/i)
    const description = normalize(text.split(/\bposition\s*:/i)[0])
      ?.replace(/^TESCRA(?:'s)? Post\s*/i, '') || null

    if (!title) return null

    return {
      title,
      company: COMPANY,
      location: rawLocation ? `${rawLocation}, India` : 'India',
      city: extractCity(rawLocation),
      country: 'India',
      employmentType,
      sourceUrl,
      applyUrl: applyUrl || sourceUrl,
      jobDescription: description,
      remoteStatus: inferRemoteStatus(rawLocation),
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    Accept: 'text/html,application/xhtml+xml',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createTescraScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const homepageHtml = await fetchText(HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('TESCRA verified official homepage no longer matches the expected company surface')
    }

    const linkedinHtml = await fetchText(LINKEDIN_COMPANY_URL)
    if (!pageIndicatesTescraLinkedinCompany(linkedinHtml)) {
      throw new Error('TESCRA verified LinkedIn company page no longer matches the expected public organization page')
    }

    return extractJobPostings(linkedinHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createTescraScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobs = await run()
  console.log(`TESCRA jobs scraped: ${jobs.length}`)
}
