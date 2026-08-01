import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREER_PAGE_URL = 'https://www.doctreen.com/carrieres'

const SOURCE = 'doctreen'
const COMPANY = 'Doctreen'

const normalize = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const toSlug = (value) => normalize(value)
  ?.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const getOpeningsSection = (html) => {
  const page = String(html ?? '').replace(/\u2019/g, "'")
  const heading = page.match(/<h[1-6]\b[^>]*>\s*Nous\s+recherchons\s+activement\s+ces\s+profils\s*<\/h[1-6]>/i)
  const applicationHeading = page.match(/<h[1-6]\b[^>]*>\s*Envie\s+de\s+rejoindre\s+l(?:'|’|&rsquo;)aventure\s+Doctreen\s*\?\s*<\/h[1-6]>/i)

  if (!heading || !applicationHeading || applicationHeading.index <= heading.index) {
    throw new Error('Doctreen careers page no longer exposes the expected openings page shape')
  }

  const applicationSection = page.slice(applicationHeading.index)
  if (!/J(?:'|’|&rsquo;)envoie\s+ma\s+candidature/i.test(applicationSection)) {
    throw new Error('Doctreen careers page no longer exposes the expected openings page shape')
  }

  return page.slice(heading.index, applicationHeading.index)
}

export const extractCareerJobs = (html) => {
  const section = getOpeningsSection(html)
  const titles = [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => normalize(match[1]))
    .filter(Boolean)

  if (titles.length === 0) {
    throw new Error('Doctreen careers page no longer exposes the expected openings page shape')
  }

  return [...new Set(titles)].map((title) => {
    const jobId = toSlug(title)

    return {
      title,
      company: COMPANY,
      department: null,
      location: 'France',
      city: null,
      country: 'France',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl: CAREER_PAGE_URL,
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
  })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    Accept: 'text/html,application/xhtml+xml',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createDoctreenScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const jobs = extractCareerJobs(await fetchText(CAREER_PAGE_URL))

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createDoctreenScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobs = await run()
  console.log(`Doctreen jobs scraped: ${jobs.length}`)
}
