import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'stridelysolutions'
export const COMPANY = 'Stridely Solutions'
export const HOMEPAGE_URL = 'https://www.stridelysolutions.com/'
export const CAREERS_URL = 'https://www.stridelysolutions.com/insights/blog/jobs/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Stridely Solutions',
  adapter: 'script',
  modulePath: '../../scraper/stridelysolutions/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'awsm-job-archive-load-more-shell',
  extractionStrategy: 'verified-first-party-jobs-archive+awsm-job-listing-cards+same-domain-detail-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'stridelysolutions.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.stridelysolutions.com/insights/blog/jobs/ was the live first-party Stridely Solutions jobs archive and that it exposed public listing cards such as Rebar and SAP SD with same-domain More Details links.',
  dryRunFile: 'stridelysolutions/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const toTitleCase = (value) => String(value ?? '')
  .split('-')
  .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : '')
  .join(' ')

const NON_INDIA_LOCATION_SLUGS = new Set(['canada', 'usa', 'united-states'])

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Job Openings Archive\s*-\s*Stridely Solutions\s*<\/title>/i.test(page)
    && /<h1[^>]*>\s*Job Openings\s*<\/h1>/i.test(page)
    && /awsm-job-listing-item/i.test(page)
}

export const extractJobCards = (html) => {
  const page = String(html ?? '')
  const jobs = []
  const currentCards = [...page.matchAll(
    /<article\b([^>]*\bawsm_job_openings\b[^>]*)>([\s\S]*?)<\/article>/gi,
  )]

  if (currentCards.length > 0) {
    for (const [, attributes, cardHtml] of currentCards) {
      const title = normalizeWhitespace(
        cardHtml.match(/elementor-post__title[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>\s*([\s\S]*?)\s*<\/a>/i)?.[2],
      )
      const sourceUrl = normalizeWhitespace(
        cardHtml.match(/elementor-post__title[^>]*>\s*<a[^>]+href=["']([^"']+)["']/i)?.[1],
      )
      const cities = [...String(attributes).matchAll(/\bjob-location-([a-z0-9-]+)/gi)]
        .map((match) => match[1].toLowerCase())
        .filter((slug) => !NON_INDIA_LOCATION_SLUGS.has(slug))
        .map(toTitleCase)
        .filter(Boolean)

      if (!title || !sourceUrl || cities.length === 0) continue

      jobs.push({
        title,
        location: `${cities.join(', ')}, India`,
        city: cities[0],
        sourceUrl,
        applyUrl: sourceUrl,
      })
    }

    return jobs
  }

  const cardStarts = [...page.matchAll(/<div class="awsm-job-listing-item\b/gi)].map((match) => match.index)
  const cards = cardStarts.map((start, index) => {
    const end = cardStarts[index + 1] ?? page.length
    return page.slice(start, end)
  })

  for (const card of cards) {
    const sourceUrl = normalizeWhitespace(
      card.match(/<a[^>]+href="([^"]+)"[^>]+class="awsm-job-item"/i)?.[1]
      || card.match(/<a[^>]+class="awsm-job-item"[^>]+href="([^"]+)"/i)?.[1]
      || card.match(/class="awsm-job-more"[^>]*href="([^"]+)"/i)?.[1]
      || card.match(/awsm-job-post-title">\s*<a href="([^"]+)"/i)?.[1],
    )
    const title = normalizeWhitespace(
      card.match(/awsm-job-post-title">\s*<a[^>]*>([^<]+)<\/a>/i)?.[1]
      || card.match(/awsm-job-post-title">\s*([^<]+)</i)?.[1],
    )
    const locationTerms = [...card.matchAll(
      /awsm-job-specification-job-location[\s\S]*?<\/div>/gi,
    )]
      .flatMap((match) => [...match[0].matchAll(/awsm-job-specification-term">([^<]+)</gi)])
      .map((item) => normalizeWhitespace(item[1]))
      .filter(Boolean)
    const fallbackTerms = [...card.matchAll(/awsm-job-specification-term">([^<]+)</gi)]
      .map((item) => normalizeWhitespace(item[1]))
      .filter(Boolean)
    const location = locationTerms.length > 0
      ? locationTerms.join(' ')
      : fallbackTerms.at(-1)

    if (!title || !sourceUrl || !location) continue

    jobs.push({
      title,
      location,
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return jobs
}

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
  const page = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(page)) {
    throw new Error('Stridely Solutions verified jobs archive changed materially')
  }

  const jobs = extractJobCards(page)
  if (!jobs.length) {
    throw new Error('Stridely Solutions jobs archive no longer exposes trusted job cards')
  }

  return jobs.map((job) => ({
    ...job,
    company: COMPANY,
    country: 'India',
    link: job.applyUrl,
    source: SOURCE,
    scrapedAt: now(),
  }))
}

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

