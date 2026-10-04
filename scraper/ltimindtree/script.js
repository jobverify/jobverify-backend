import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import {
  extractSearchSummary,
  extractSearchResults as parseRipplehireResults,
  extractJobDetail as parseRipplehireDetail,
} from '../altimetrik/script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'ltimindtree'
export const COMPANY = 'LTIMindtree'
const BASE_URL = 'https://ltimindtree.ripplehire.com'
const TOKEN = 'xviyQvbnyYZdGtozXoNm'
const CAREER_SOURCE = 'CAREERSITE'
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_DETAIL_CONCURRENCY = 6
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

// The India link on https://www.ltm.com/careers supplies this token and geo filter.
export const buildIndiaSearchUrl = () => `${BASE_URL}/candidate/?token=${TOKEN}&lang=en&source=${CAREER_SOURCE}#list/geo=India`
export const buildSearchRequestPayload = (page = 0, pageSize = DEFAULT_PAGE_SIZE) => ({
  page,
  search: '*:*',
  token: TOKEN,
  source: CAREER_SOURCE,
  pagesize: pageSize,
  geo: 'India',
})
export const buildDetailUrl = (jobSeq) =>
  `${BASE_URL}/candidate/?token=${TOKEN}&source=${CAREER_SOURCE}#detail/job/${encodeURIComponent(jobSeq)}`
export const buildApplyUrl = (jobSeq) =>
  `${BASE_URL}/candidate/?token=${TOKEN}&source=${CAREER_SOURCE}#apply/job/${encodeURIComponent(jobSeq)}`

const searchUrl = `${BASE_URL}/candidate/candidatejobsearch`
const detailUrl = (jobSeq) => {
  const params = new URLSearchParams({ token: TOKEN, jobSeq, source: CAREER_SOURCE, lang: 'en' })
  return `${BASE_URL}/candidate/candidatejobdetail?${params}`
}

const defaultFetchText = async (url, options = {}) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/xml,text/xml,*/*',
          ...(options.headers || {}),
        },
        body: options.body,
        signal: AbortSignal.timeout(20000),
      })
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} for ${url}`)
        error.status = response.status
        throw error
      }
      return response.text()
    } catch (error) {
      if (attempt === 3 || (error.status && error.status !== 429 && error.status < 500)) throw error
      await delay(1000 * 2 ** attempt)
    }
  }
}

const parseIndiaPage = (xml, page, pageSize, expectedTotal) => {
  if (!/^\s*<JobPageVO>/.test(xml)) throw new Error('LTIMindtree invalid India listing response')
  const summary = extractSearchSummary(xml)
  const total = summary.totalJobCount
  if (!Number.isInteger(total) || total < 0 || summary.startJobIndex !== page * pageSize
    || summary.pageSize !== pageSize || (expectedTotal != null && total !== expectedTotal)) {
    throw new Error('LTIMindtree incomplete or changed India listing count')
  }
  const blocks = [...xml.matchAll(/<jobVoList>\s*<jobSeq>[\s\S]*?<\/jobVoList>/gi)].map(match => match[0])
  const expectedPageCount = Math.min(pageSize, total - page * pageSize)
  if (blocks.length !== expectedPageCount || blocks.some(block => !/<jobLocation>\s*India\s*<\/jobLocation>|<jobLocation\s*\/>/i.test(block))) {
    throw new Error('LTIMindtree incomplete or non-India listing page')
  }
  const listings = parseRipplehireResults(xml)
  if (listings.length !== blocks.length || new Set(listings.map(job => job.jobId)).size !== listings.length) {
    throw new Error('LTIMindtree incomplete or duplicate listing page')
  }
  return { total, listings: listings.map(job => ({
    ...job,
    city: /^select location$/i.test(job.city || '') ? null : job.city,
    location: /^select location$/i.test(job.city || '') ? 'India' : job.location,
    sourceUrl: buildDetailUrl(job.jobId),
    applyUrl: buildApplyUrl(job.jobId),
  })) }
}

export const createLtimindtreeScraper = () => ({
  async run({ fetchText = defaultFetchText, pageSize = DEFAULT_PAGE_SIZE, detailConcurrency = DEFAULT_DETAIL_CONCURRENCY } = {}) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('Invalid LTIMindtree page size')
    if (!Number.isInteger(detailConcurrency) || detailConcurrency < 1 || detailConcurrency > 10) {
      throw new Error('Invalid LTIMindtree detail concurrency')
    }

    const listings = []
    const seenIds = new Set()
    let expectedTotal = null
    for (let page = 0; expectedTotal === null || page * pageSize < expectedTotal; page += 1) {
      const body = new URLSearchParams({
        careerSiteUrlParams: JSON.stringify(buildSearchRequestPayload(page, pageSize)),
        lang: 'en',
      })
      const xml = await fetchText(searchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body,
      })
      const result = parseIndiaPage(xml, page, pageSize, expectedTotal)
      expectedTotal = result.total
      for (const listing of result.listings) {
        if (seenIds.has(listing.jobId)) throw new Error(`LTIMindtree duplicate job ${listing.jobId} across pages`)
        seenIds.add(listing.jobId)
        listings.push(listing)
      }
    }
    if (listings.length !== expectedTotal) throw new Error('LTIMindtree incomplete India listing snapshot')

    const jobs = new Array(listings.length)
    let nextIndex = 0
    const worker = async () => {
      while (nextIndex < listings.length) {
        const index = nextIndex++
        const listing = listings[index]
        const xml = await fetchText(detailUrl(listing.jobId))
        if (!/<companyCd>\s*LTIMINDIA\s*<\/companyCd>/i.test(xml)) {
          throw new Error(`LTIMindtree unverified India company for job ${listing.jobId}`)
        }
        const detail = parseRipplehireDetail(xml, listing)
        if (!detail.jobDescription || detail.jobId !== listing.jobId) {
          throw new Error(`LTIMindtree incomplete job detail ${listing.jobId}`)
        }
        jobs[index] = {
          jobId: listing.jobId,
          requisitionId: detail.requisitionId || listing.requisitionId,
          title: detail.title || listing.title,
          company: COMPANY,
          country: 'India',
          department: detail.department || listing.department,
          location: detail.location || listing.location,
          city: /^select location$/i.test(detail.city || '') ? null : detail.city || listing.city,
          link: listing.applyUrl,
          applyUrl: listing.applyUrl,
          sourceUrl: listing.sourceUrl,
          source: SOURCE,
          employmentType: detail.employmentType,
          experienceRequired: detail.experienceRequired,
          jobDescription: detail.jobDescription,
          minimumQualification: detail.minimumQualification,
          preferredQualification: detail.preferredQualification,
          requiredSkills: detail.requiredSkills,
          postingDate: detail.postingDate || listing.postingDate,
          closingDate: detail.closingDate,
          scrapedAt: new Date().toISOString(),
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(detailConcurrency, listings.length) }, worker))
    return jobs
  },
})

export const run = async (options = {}) => createLtimindtreeScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running LTIMindtree scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
  }
}
