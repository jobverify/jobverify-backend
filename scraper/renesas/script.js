import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'renesas'
export const COMPANY = 'Renesas Electronics'
export const VERIFIED_AT = '2026-07-25'
export const INDIA_JOBS_URL = 'https://jobs.renesas.com/Jobs?options=659&page='
export const INDIA_CAREERS_URL = 'https://jobs.renesas.com/india'
export const BASE_URL = 'https://jobs.renesas.com'

const stripTags = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#xA0;|&#160;|&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim()

const match = (value, pattern) => value.match(pattern)?.[1] || ''

const field = (card, name) => stripTags(match(
  card,
  new RegExp(
    `attrax-vacancy-tile__option-${name}(?:-valueset)?[\\s\\S]*?attrax-vacancy-tile__item-value[^>]*>([\\s\\S]*?)<`,
    'i',
  ),
))

const extractDescription = (card) => stripTags(match(
  card,
  /attrax-vacancy-tile__description-value[^>]*>([\s\S]*?)(?:<\/p>|<\/div>)/i,
))

const inferExperienceFromDescription = (description) => {
  const normalizedDescription = stripTags(description)
  if (!normalizedDescription) return null

  const experienceProfile = extractJobFilterSignals({
    description: normalizedDescription,
  })?.experienceProfile
  const evidence = stripTags(experienceProfile?.evidence)

  if (!evidence || experienceProfile?.confidence !== 'high') {
    return null
  }

  return (
    experienceProfile.minimumYears === 0 && experienceProfile.maximumYears === 0
      ? 'No experience required'
      : evidence
  )
}

export const extractRenesasJobs = (html = '') => {
  const cards = String(html).match(
    /<div\s+class=["'][^"']*\battrax-vacancy-tile\b[^"']*["'][\s\S]*?(?=<div\s+class=["'][^"']*\battrax-vacancy-tile\b|$)/gi,
  ) || []

  return cards.map((card) => {
    const title = stripTags(match(
      card,
      /attrax-vacancy-tile__title[^>]*href=["'][^"']+["'][^>]*>([\s\S]*?)<\/a>/i,
    ))
    const link = match(card, /attrax-vacancy-tile__title[^>]*href=["']([^"']+)["']/i)
    const location = stripTags(match(
      card,
      /attrax-vacancy-tile__location-freetext[\s\S]*?attrax-vacancy-tile__item-value[^>]*>([\s\S]*?)<\/p>/i,
    ))
    const description = extractDescription(card)
    const jobId = match(card, /data-jobid=["']([^"']+)["']/i)

    if (!title || !link || !location || !/\bindia\b/i.test(location)) return null

    const sourceUrl = new URL(link, BASE_URL).toString()
    return {
      title,
      company: COMPANY,
      location,
      city: field(card, 'location') || location.split(',')[0]?.trim() || null,
      country: 'India',
      link: sourceUrl,
      sourceUrl,
      applyUrl: sourceUrl,
      jobId: jobId || null,
      requisitionId: jobId || null,
      department: field(card, 'function') || null,
      employmentType: field(card, 'type-of-employment') || null,
      remoteStatus: field(card, 'remote') || null,
      jobDescription: description || null,
      experienceRequired: inferExperienceFromDescription(description),
      publicExperienceChecked: Boolean(description),
      source: SOURCE,
    }
  }).filter(Boolean)
}

const getTotalResults = (html) => Number.parseInt(
  match(html, /(\d+)\s+result\(s\)/i),
  10,
)

export const createRenesasScraper = () => ({
  async run({
    fetchText = (url, options = {}) => fetchTextWithRetry(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; Jobverify/1.0)',
      },
      label: SOURCE,
      timeoutMs: 25000,
      ...options,
    }),
  } = {}) {
    const firstPage = await fetchText(`${INDIA_JOBS_URL}1`)
    const totalResults = getTotalResults(firstPage)
    const firstPageJobs = extractRenesasJobs(firstPage)

    if (!Number.isFinite(totalResults) || totalResults < 0 || firstPageJobs.length === 0) {
      throw new Error('[renesas] official India jobs page did not contain a recognizable result set')
    }

    const pageSize = firstPageJobs.length
    const pageCount = Math.ceil(totalResults / pageSize)
    const pages = [firstPageJobs]

    for (let page = 2; page <= pageCount; page += 1) {
      const jobs = extractRenesasJobs(await fetchText(`${INDIA_JOBS_URL}${page}`))
      if (jobs.length === 0) {
        throw new Error(`[renesas] official India jobs page ${page} did not contain recognizable job cards`)
      }
      pages.push(jobs)
    }

    const seen = new Set()
    return pages.flat().filter((job) => {
      const identity = String(job.jobId || job.sourceUrl)
      if (seen.has(identity)) return false
      seen.add(identity)
      return true
    })
  },
})

export const run = (options = {}) => createRenesasScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
