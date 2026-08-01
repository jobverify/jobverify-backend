import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const LINKEDIN_COMPANY_URL = 'https://www.linkedin.com/company/academor/'
const SOURCE = 'academoredutech'
const COMPANY = 'Academor Edutech'

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

const extractArticleParts = (html) => [...String(html ?? '').matchAll(
  /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
)].map((match) => {
  const block = match[0]
  const links = [...block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((link) => absoluteUrl(link[1]))
    .filter(Boolean)
  const sourceUrl = links.find((link) => /linkedin\.com\/posts\//i.test(link))
  const applyUrl = links.find((link) => !/linkedin\.com/i.test(link))

  return {
    text: decodeHtml(match[1]),
    sourceUrl,
    applyUrl,
  }
})

export const extractJobPostings = (html) => extractArticleParts(html)
  .filter(({ text, sourceUrl }) =>
    sourceUrl && /\b(hiring|job opening|job opportunity|vacancy)\b/i.test(text),
  )
  .map(({ text, sourceUrl, applyUrl }) => {
    const title = getField(text, /\bposition\s*:\s*(.+?)(?=\s+location\s*:|\s+industry\s*:|\s+full[- ]?time\/part[- ]?time\s*:|$)/i)
    const rawLocation = getField(text, /\blocation\s*:\s*(.+?)(?=\s+industry\s*:|\s+full[- ]?time\/part[- ]?time\s*:|\s+work from office\s*:|$)/i)
    const employmentType = getField(text, /\bfull[- ]?time\/part[- ]?time\s*:\s*(.+?)(?=\s+work from office\s*:|\s+office time\s*:|\s+requirements\s*:|$)/i)
    const description = normalize(text.split(/\bposition\s*:/i)[0])
      ?.replace(/^Academor(?:'s)? Post\s*/i, '') || null
    const location = rawLocation ? `${rawLocation}, India` : 'India'
    const city = rawLocation?.split(',')[0]?.trim() || null

    if (!title) return null

    return {
      title,
      company: COMPANY,
      location,
      city,
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

export const createAcademorEdutechScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const jobs = extractJobPostings(await fetchText(LINKEDIN_COMPANY_URL))

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createAcademorEdutechScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobs = await run()
  console.log(`Academor Edutech jobs scraped: ${jobs.length}`)
}
