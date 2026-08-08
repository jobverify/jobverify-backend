import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const COMPANY_NAME = 'Meta'
const SOURCE = 'meta'
const SEARCH_BASE_URL = 'https://www.metacareers.com/jobsearch/'
const DETAIL_BASE_URL = 'https://www.metacareers.com/profile/job_details/'
const JOB_LINK_SELECTOR = 'a[href*="/profile/job_details/"]'
const NEXT_BUTTON_SELECTOR = '[aria-label="Button to select next week"]'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const launchMetaBrowser = async () => {
  throw new Error(
    '[meta] API-only migration required: no verified HTTP/API contract is available; browser automation is disabled.',
  )
}

const createMetaPage = async () => {
  throw new Error(
    '[meta] API-only migration required: no verified HTTP/API contract is available; browser automation is disabled.',
  )
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&amp;/gi, '&')

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/remote/i.test(normalized)) return 'Remote'
  return normalized.split(',')[0]?.trim() || null
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const toAbsoluteUrl = (value, baseUrl = SEARCH_BASE_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeDetailLocation = (jobLocation) => {
  const locations = Array.isArray(jobLocation) ? jobLocation : [jobLocation].filter(Boolean)
  const place = locations.find(Boolean)

  if (!place) return null

  return normalizeWhitespace(
    place.name ||
    [
      place.address?.addressLocality,
      place.address?.addressRegion,
    ].filter(Boolean).join(', '),
  )
}

const parseJsonLd = (html) => {
  const raw = extractFirst(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
    html,
  )

  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.find((item) => item?.['@type'] === 'JobPosting') || parsed[0] || null
    }
    return parsed
  } catch {
    return null
  }
}

export const buildSearchUrl = (query = 'India') => {
  const url = new URL(SEARCH_BASE_URL)
  url.searchParams.set('q', query)
  return url.toString()
}

export const buildJobUrl = (jobIdOrPath) => {
  const normalized = normalizeWhitespace(jobIdOrPath)
  if (!normalized) return null
  if (/^\d+$/.test(normalized)) {
    return `${DETAIL_BASE_URL}${normalized}`
  }
  return toAbsoluteUrl(normalized, DETAIL_BASE_URL)
}

export const extractSearchResults = (html) => [...String(html).matchAll(
  /<a\b[^>]*href="([^"]*\/profile\/job_details\/(\d+)[^"]*)"[^>]*>[\s\S]*?<\/a>/gi,
)]
  .map((match) => {
    const card = match[0]
    const href = match[1]
    const jobId = match[2]
    const title = normalizeWhitespace(extractFirst(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i, card))
    const spanTexts = [...card.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)]
      .map((spanMatch) => stripTags(spanMatch[1]))
      .filter(Boolean)
    const location = spanTexts.find((text) => /\bIndia\b/i.test(text))
    const sourceUrl = buildJobUrl(href)

    if (!title || !location || !sourceUrl) {
      return null
    }

    return {
      title,
      company: COMPANY_NAME,
      department: null,
      location,
      city: extractCity(location),
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
    }
  })
  .filter(Boolean)

export const extractPaginationSummary = (html) => {
  const currentPage = Number.parseInt(extractFirst(/Page\s+(\d+)\s+of\s+\d+/i, html) || '', 10) || null
  const totalPages = Number.parseInt(extractFirst(/Page\s+\d+\s+of\s+(\d+)/i, html) || '', 10) || null
  const totalJobCount = Number.parseInt(extractFirst(/(\d+)\s+Items/i, html) || '', 10) || null

  return {
    currentPage,
    totalPages,
    hasNext: Boolean(
      currentPage &&
      totalPages &&
      currentPage < totalPages &&
      /aria-label="Button to select next week"/i.test(String(html)),
    ),
    totalJobCount,
  }
}

export const extractJobDetail = (html) => {
  const payload = parseJsonLd(html)
  if (!payload) {
    return {
      title: null,
      company: COMPANY_NAME,
      location: null,
      city: null,
      employmentType: null,
      jobDescription: null,
      postingDate: null,
      closingDate: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      experienceRequired: null,
    }
  }

  const location = normalizeDetailLocation(payload.jobLocation)
  const qualifications = stripTags(payload.qualifications)

  return {
    title: normalizeWhitespace(payload.title),
    company: normalizeWhitespace(payload.hiringOrganization?.name) || COMPANY_NAME,
    location,
    city: extractCity(location),
    employmentType: normalizeWhitespace(payload.employmentType),
    jobDescription: stripTags(payload.description),
    postingDate: normalizeWhitespace(payload.datePosted),
    closingDate: normalizeWhitespace(payload.validThrough),
    minimumQualification: qualifications,
    preferredQualification: null,
    requiredSkills: [],
    experienceRequired: qualifications,
  }
}

const normalizeListingRecord = ({ href, jobId, title, location }) => {
  const normalizedTitle = normalizeWhitespace(title)
  const normalizedLocation = normalizeWhitespace(location)
  const normalizedJobId = normalizeWhitespace(jobId)
  const sourceUrl = buildJobUrl(href || normalizedJobId)

  if (!normalizedTitle || !normalizedLocation || !sourceUrl || !/\bIndia\b/i.test(normalizedLocation)) {
    return null
  }

  return {
    title: normalizedTitle,
    company: COMPANY_NAME,
    department: null,
    location: normalizedLocation,
    city: extractCity(normalizedLocation),
    jobId: normalizedJobId,
    requisitionId: normalizedJobId,
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
  }
}

const readSearchResultsFromPage = async (page) => {
  const records = await page.$$eval(
    JOB_LINK_SELECTOR,
    (anchors) => anchors.map((anchor) => {
      const href = anchor.getAttribute('href')
      const title = anchor.querySelector('h3')?.textContent || null
      const spans = [...anchor.querySelectorAll('span')]
        .map((span) => span.textContent?.replace(/\s+/g, ' ').trim() || null)
        .filter(Boolean)
      const location = spans.find((text) => /India/i.test(text)) || null
      const jobId = href?.match(/\/profile\/job_details\/(\d+)/)?.[1] || null

      return {
        href,
        jobId,
        title,
        location,
      }
    }),
  ).catch(() => [])

  return records
    .map((record) => normalizeListingRecord(record))
    .filter(Boolean)
}

const readPaginationFromPage = async (page) => {
  const payload = await page.evaluate((nextButtonSelector) => {
    const text = document.body.innerText || ''
    const pageMatch = text.match(/Page\s+(\d+)\s+of\s+(\d+)/i)
    const itemsMatch = text.match(/(\d+)\s+Items/i)
    const nextButton = document.querySelector(nextButtonSelector)

    return {
      currentPage: pageMatch ? Number.parseInt(pageMatch[1], 10) : null,
      totalPages: pageMatch ? Number.parseInt(pageMatch[2], 10) : null,
      totalJobCount: itemsMatch ? Number.parseInt(itemsMatch[1], 10) : null,
      hasNextButton: Boolean(nextButton),
      nextDisabled: Boolean(
        nextButton &&
        ((nextButton).disabled || nextButton.getAttribute('aria-disabled') === 'true')
      ),
    }
  }, NEXT_BUTTON_SELECTOR).catch(() => null)

  if (!payload) {
    return {
      currentPage: null,
      totalPages: null,
      hasNext: false,
      totalJobCount: null,
    }
  }

  return {
    currentPage: payload.currentPage,
    totalPages: payload.totalPages,
    hasNext: Boolean(
      payload.hasNextButton &&
      !payload.nextDisabled &&
      payload.currentPage &&
      payload.totalPages &&
      payload.currentPage < payload.totalPages
    ),
    totalJobCount: payload.totalJobCount,
  }
}

export const createMetaScraper = () => {
  const run = async ({
    maxPages = config.maxPages,
    maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  } = {}) => {
    let browser

    try {
      browser = await launchMetaBrowser()
      const searchPage = await createMetaPage(browser)
      const detailPage = await createMetaPage(browser)

      await searchPage.goto(buildSearchUrl(), { waitUntil: 'domcontentloaded' })
      await searchPage.waitForSelector('body', { timeout: config.jobListingTimeoutMs }).catch(() => null)
      await delay(config.pageLoadDelayMs)

      const listings = []
      const seenJobIds = new Set()

      for (let pageCount = 0; pageCount < maxPages; pageCount += 1) {
        await searchPage.waitForSelector(JOB_LINK_SELECTOR, { timeout: config.jobListingTimeoutMs })
        const pageJobs = await readSearchResultsFromPage(searchPage)

        for (const job of pageJobs) {
          if (seenJobIds.has(job.jobId)) continue
          seenJobIds.add(job.jobId)
          listings.push(job)
          if (maxJobs && listings.length >= maxJobs) {
            break
          }
        }

        if (maxJobs && listings.length >= maxJobs) {
          break
        }

        const pagination = await readPaginationFromPage(searchPage)
        if (!pagination.hasNext) {
          break
        }

        const nextButton = await searchPage.$(NEXT_BUTTON_SELECTOR)
        if (!nextButton) {
          break
        }

        const currentPage = pagination.currentPage || pageCount + 1

        await nextButton.evaluate((node) => node.click())
        await searchPage.waitForFunction(
          (expectedPage) => {
            const match = (document.body.innerText || '').match(/Page\s+(\d+)\s+of\s+\d+/i)
            return Boolean(match && Number.parseInt(match[1], 10) > expectedPage)
          },
          { timeout: config.jobListingTimeoutMs },
          currentPage,
        ).catch(() => null)
        await delay(config.pageLoadDelayMs)
      }

      const selectedJobs = maxJobs ? listings.slice(0, maxJobs) : listings
      const jobs = []

      for (const job of selectedJobs) {
        let detail = extractJobDetail('')

        if (job.sourceUrl) {
          try {
            await detailPage.goto(job.sourceUrl, { waitUntil: 'domcontentloaded' })
            await detailPage.waitForSelector('script[type="application/ld+json"]', {
              timeout: config.jobListingTimeoutMs,
            }).catch(() => null)
            await delay(config.pageLoadDelayMs)
            const jsonLd = await detailPage.$eval(
              'script[type="application/ld+json"]',
              (element) => element.textContent || '',
            ).catch(() => '')
            detail = extractJobDetail(
              jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : '',
            )
          } catch {
            detail = extractJobDetail('')
          }
        }

        jobs.push({
          ...job,
          title: detail.title || job.title,
          company: detail.company || job.company,
          location: detail.location || job.location,
          city: detail.city || job.city,
          employmentType: detail.employmentType || job.employmentType,
          experienceRequired: detail.experienceRequired || job.experienceRequired,
          minimumQualification: detail.minimumQualification || job.minimumQualification,
          preferredQualification: detail.preferredQualification || job.preferredQualification,
          requiredSkills: detail.requiredSkills || job.requiredSkills,
          postingDate: detail.postingDate || job.postingDate,
          closingDate: detail.closingDate || job.closingDate,
          jobDescription: detail.jobDescription || job.jobDescription,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })
      }

      return jobs
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  return {
    buildSearchUrl,
    buildJobUrl,
    extractSearchResults,
    extractPaginationSummary,
    extractJobDetail,
    run,
  }
}

const scraper = createMetaScraper()

export const { run } = scraper

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Meta scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
