import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const INDIA_SITE_URL = 'https://www.wsp.com/en-gl/sites/india'
export const JOBS_PAGE_URL = 'https://www.wsp.com/en-gl/careers/job-opportunities?country=IN'

export const COMPANY = 'WSP India'
export const SOURCE = 'wspindia'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const ORACLE_PREVIEW_LINK_PATTERN =
  /https:\/\/emit\.fa\.ca3\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_2001\/requisitions\/preview\/(\d+)/i
const BROWSER_TIMEOUT_MS = 60000
const BROWSER_SETTLE_DELAY_MS = 8000

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|span|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractVisibleText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/span|\/h[1-6]|\/section|\/article|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<(li|p|div|span|section|article|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, html) => {
  const match = pattern.exec(String(html ?? ''))
  return match ? stripTags(match[1]) : null
}

const extractStructuredText = (html) =>
  [...String(html ?? '').matchAll(/<(span|div|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(([, , value]) => stripTags(value))
    .filter(Boolean)

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split('|')[0]?.trim() || null
}

export const hasOfficialIndiaSiteSignal = (html) => {
  const page = String(html ?? '')
  return /WSP/i.test(page)
    && /Search and apply/i.test(page)
    && /\/en-gl\/careers\/job-opportunities\?country=IN/i.test(page)
}

export const hasOfficialJobsPageSignal = (html) => {
  const page = String(html ?? '')
  return /Find your next opportunity/i.test(page)
    && /emit\.fa\.ca3\.oraclecloud\.com/i.test(page)
}

export const hasCloudflareChallengeSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(page)
    && /cloudflare/i.test(page)
    && (
      text.includes('Please enable cookies')
      || /cdn-cgi\/challenge-platform/i.test(page)
      || /challenges\.cloudflare\.com/i.test(page)
    )
}

export const buildJobsPageUrl = ({ page = 1 } = {}) =>
  Number(page) > 1 ? `${JOBS_PAGE_URL}&page=${Number(page)}` : JOBS_PAGE_URL

export const buildJobDetailsApiUrl = (jobId) =>
  `https://emit.fa.ca3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%22${encodeURIComponent(String(jobId ?? ''))}%22,siteNumber=CX_2001`

export const extractMaxPageNumber = (html) => {
  const pageNumbers = [
    ...[...String(html ?? '').matchAll(/country=IN(?:&amp;|&)page=(\d+)/gi)]
      .map(([, value]) => Number.parseInt(value, 10))
      .filter(Number.isInteger),
    ...[...String(html ?? '').matchAll(/class=["'][^"']*page(?:prev|next)[^"']*["'][^>]*>\s*(\d+)\s*<\/a>/gi)]
      .map(([, value]) => Number.parseInt(value, 10))
      .filter(Number.isInteger),
  ]

  return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1
}

export const extractJobsFromHtml = (html) => {
  const jobs = []
  const page = String(html ?? '')
  const anchorPattern = /<a\b[^>]*href=(["'])(https:\/\/emit\.fa\.ca3\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_2001\/requisitions\/preview\/\d+)\1[^>]*>([\s\S]*?)<\/a>/gi

  for (const match of page.matchAll(anchorPattern)) {
    const [, , href, innerHtml] = match
    const previewMatch = href.match(ORACLE_PREVIEW_LINK_PATTERN)
    if (!previewMatch) continue

    const segments = extractStructuredText(innerHtml)
    const title = extractFirst(/<h[1-6][^>]*>\s*([\s\S]*?)\s*<\/h[1-6]>/i, innerHtml)
      || normalizeWhitespace(segments[0])
      || stripTags(innerHtml)
    const location = extractFirst(/class=["'][^"']*text-locations[^"']*["'][^>]*>\s*([\s\S]*?)\s*<\/div>/i, innerHtml)
      || normalizeWhitespace(segments.findLast((segment) => segment && segment !== title))
      || null

    if (!title || !location) continue

    jobs.push({
      title,
      company: COMPANY,
      location,
      city: extractCity(location),
      sourceUrl: href,
      applyUrl: href,
      jobId: previewMatch[1],
      requisitionId: previewMatch[1],
      jobDescription: null,
    })
  }

  return jobs
}

const inferExperienceFromDescription = (jobDescription) => {
  const normalizedDescription = normalizeWhitespace(jobDescription)
  if (!normalizedDescription) return null

  const experienceProfile = extractJobFilterSignals({
    description: normalizedDescription,
  })?.experienceProfile
  const evidence = normalizeWhitespace(experienceProfile?.evidence)

  if (!evidence || experienceProfile?.confidence !== 'high') {
    return null
  }

  return (
    experienceProfile.minimumYears === 0 && experienceProfile.maximumYears === 0
      ? 'No experience required'
      : evidence
  )
}

const buildDetailDescription = (detailRecord = {}) => {
  const sections = [
    detailRecord.ExternalDescriptionStr,
    detailRecord.InternalResponsibilitiesStr,
    detailRecord.ExternalQualificationsStr,
  ]
    .map((value) => extractVisibleText(value))
    .filter(Boolean)

  return sections.length > 0 ? sections.join('\n\n') : null
}

export const enrichJobFromDetailRecord = (job, detailRecord = null) => {
  const detailText = buildDetailDescription(detailRecord) || job.jobDescription || null
  const experienceRequired = inferExperienceFromDescription(detailText)

  return {
    ...job,
    jobDescription: detailText || job.jobDescription || null,
    experienceRequired: experienceRequired || job.experienceRequired || null,
    publicExperienceChecked: Boolean(detailRecord && (detailText || detailRecord.Id)),
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })

  return {
    status: response.status,
    url: response.url || url,
    html: await response.text(),
  }
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

const isCloudflareChallengePage = (page = {}) =>
  Number(page.status) === 403 && hasCloudflareChallengeSignal(page.html)

const createRenderedPageFetcher = () => {
  let browser = null
  let page = null

  const getPage = async () => {
    if (!browser) {
      browser = await launchBrowser({ headless: true })
      page = await createOptimizedPage(browser)
      await page.setUserAgent(USER_AGENT)
    }

    return page
  }

  return {
    close: async () => {
      if (browser) {
        await browser.close()
      }
    },
    fetchPage: async (url) => {
      const browserPage = await getPage()
      const response = await browserPage.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: BROWSER_TIMEOUT_MS,
      })

      try {
        await browserPage.waitForFunction(
          () => document.body.innerText.includes('Job Description'),
          { timeout: 15000 },
        )
      } catch {
        await new Promise((resolve) => setTimeout(resolve, BROWSER_SETTLE_DELAY_MS))
      }

      return {
        status: response?.status?.() ?? 0,
        url: browserPage.url(),
        html: await browserPage.content(),
        text: await browserPage.evaluate(() => document.body.innerText),
      }
    },
  }
}

export const createWspIndiaScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : null,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
    fetchBrowserPage,
  } = {}) {
    let renderedPageFetcher = null

    const getBrowserPage = async () => {
      if (typeof fetchBrowserPage === 'function') {
        return fetchBrowserPage
      }

      if (!renderedPageFetcher) {
        renderedPageFetcher = createRenderedPageFetcher()
      }

      return renderedPageFetcher.fetchPage
    }

    const fetchVerifiedPage = async (url) => {
      const rawPage = await fetchPage(url)
      if (!isCloudflareChallengePage(rawPage)) {
        return rawPage
      }

      const browserPageFetcher = await getBrowserPage()
      return browserPageFetcher(url)
    }

    try {
      const indiaSitePage = await fetchVerifiedPage(INDIA_SITE_URL)
      if (!hasOfficialIndiaSiteSignal(indiaSitePage.html)) {
        throw new Error('WSP India official India site surface changed; refusing to guess the jobs handoff')
      }

      const firstJobsPage = await fetchVerifiedPage(buildJobsPageUrl({ page: 1 }))
      if (!hasOfficialJobsPageSignal(firstJobsPage.html)) {
        throw new Error('WSP India official jobs page surface changed; refusing to guess job links')
      }

      const discoveredMaxPages = extractMaxPageNumber(firstJobsPage.html)
      const totalPages = Math.max(1, maxPages ? Math.min(maxPages, discoveredMaxPages) : discoveredMaxPages)
      const jobs = []
      const seenJobIds = new Set()
      const pageHtmlCache = new Map([[1, firstJobsPage.html]])

      for (let page = 1; page <= totalPages; page += 1) {
        const pageHtml = pageHtmlCache.get(page) || (await fetchVerifiedPage(buildJobsPageUrl({ page }))).html
        const pageJobs = extractJobsFromHtml(pageHtml)
        let addedOnPage = 0

        for (const job of pageJobs) {
          if (!job.jobId || seenJobIds.has(job.jobId)) continue
          seenJobIds.add(job.jobId)
          addedOnPage += 1

          let normalizedJob = job
          try {
            const detailPayload = await fetchJson(buildJobDetailsApiUrl(job.jobId))
            normalizedJob = enrichJobFromDetailRecord(
              job,
              Array.isArray(detailPayload?.items) ? detailPayload.items[0] : null,
            )
          } catch {
            normalizedJob = job
          }

          jobs.push({
            ...normalizedJob,
            source: SOURCE,
            link: normalizedJob.applyUrl || normalizedJob.sourceUrl,
            scrapedAt: now(),
          })

          if (maxJobs && jobs.length >= maxJobs) {
            return jobs
          }
        }

        if (pageJobs.length === 0 || addedOnPage === 0) break
      }

      return jobs
    } finally {
      if (renderedPageFetcher) {
        await renderedPageFetcher.close()
      }
    }
  },
})

export const run = async (options = {}) => createWspIndiaScraper().run(options)

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
