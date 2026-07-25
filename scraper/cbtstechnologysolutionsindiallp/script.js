import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CBTS_TECHNOLOGY_SOLUTIONS_INDIA_LLP_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CBTS_TECHNOLOGY_SOLUTIONS_INDIA_LLP_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const RIPPLING_BOARD_URL = PROVIDER_METADATA.ripplingBoardUrl
export const RIPPLING_BOARD_SLUG = PROVIDER_METADATA.ripplingBoardSlug

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const extractFirst = (pattern, value) => pattern.exec(String(value ?? ''))?.[1] ?? null

const parseNextData = (html) => {
  const payload = extractFirst(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
    html,
  )

  if (!payload) {
    throw new Error('CBTS verified Rippling board no longer exposes __NEXT_DATA__')
  }

  return JSON.parse(payload)
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

export const buildBoardPageUrl = (page = 1) =>
  `${RIPPLING_BOARD_URL}?city=&country=IN&page=${page}&searchQuery=&state=&weekdayJdUid=789935&workplaceType=`

export const hasVerifiedCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  return /Careers at CBTS/i.test(rawHtml)
    && /Explore opportunities across CBTS/i.test(rawHtml)
    && new RegExp(RIPPLING_BOARD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(rawHtml)
}

export const extractIndiaJobsFromBoardHtml = (html, { scrapedAt = new Date().toISOString() } = {}) => {
  const nextData = parseNextData(html)
  const jobBoard = nextData?.props?.pageProps?.apiData?.jobBoard
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries

  if (
    normalizeWhitespace(jobBoard?.slug) !== RIPPLING_BOARD_SLUG
    || !/CBTS/i.test(String(jobBoard?.companyName ?? ''))
  ) {
    throw new Error('CBTS verified Rippling board no longer matches the expected board contract')
  }

  const listingsQuery = Array.isArray(queries)
    ? queries.find((query) => JSON.stringify(query?.queryKey ?? []).includes('"job-posts"'))
    : null
  const items = listingsQuery?.state?.data?.items

  if (!Array.isArray(items)) {
    throw new Error('CBTS verified Rippling board no longer exposes jobs data')
  }

  return items
    .map((item) => {
      const indiaLocation = Array.isArray(item?.locations)
        ? item.locations.find((location) => String(location?.countryCode ?? '').toUpperCase() === 'IN')
        : null

      if (!indiaLocation) return null

      const sourceUrl = normalizeWhitespace(item?.url)
      const title = normalizeWhitespace(item?.name)
      const jobId = normalizeWhitespace(item?.id)
      const location = normalizeWhitespace(indiaLocation?.name)

      if (!title || !jobId || !sourceUrl || !location) {
        throw new Error('CBTS verified Rippling board no longer exposes the expected India job fields')
      }

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(item?.department?.name),
        location,
        city: normalizeWhitespace(indiaLocation?.city),
        country: 'India',
        workplaceType: normalizeWhitespace(indiaLocation?.workplaceType),
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        link: sourceUrl,
        source: SOURCE,
        scrapedAt,
      }
    })
    .filter(Boolean)
}

export const createCbtstechnologysolutionsindiallpScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('CBTS verified careers page no longer matches the linked India jobs surface')
    }

    const scrapedAt = now()
    const jobs = []
    const seen = new Set()
    let page = 1
    let totalPages = 1

    while (page <= totalPages) {
      const boardHtml = await fetchText(buildBoardPageUrl(page))
      const nextData = parseNextData(boardHtml)
      const queryState = nextData?.props?.pageProps?.dehydratedState?.queries?.find((query) =>
        JSON.stringify(query?.queryKey ?? []).includes('"job-posts"'))
      totalPages = Number(queryState?.state?.data?.totalPages) || 1

      for (const job of extractIndiaJobsFromBoardHtml(boardHtml, { scrapedAt })) {
        const key = `${job.jobId}::${job.location}`
        if (seen.has(key)) continue
        seen.add(key)
        jobs.push(job)
      }

      page += 1
    }

    return jobs
  },
})

export const run = async (options = {}) => createCbtstechnologysolutionsindiallpScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
