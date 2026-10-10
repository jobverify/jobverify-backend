import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INDIA_SITE_URL = 'https://www.wsp.com/en-gl/sites/india'
export const JOBS_PAGE_URL = 'https://www.wsp.com/en-gl/careers/job-opportunities?country=IN'

export const COMPANY = 'WSP India'
export const SOURCE = 'wspindia'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const ORACLE_PREVIEW_LINK_PATTERN =
  /https:\/\/emit\.fa\.ca3\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_2001\/(?:requisitions\/preview\/|job\/)(\d+)/i

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
  if (!/emit\.fa\.ca3\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_2001\//i.test(page)) return false
  const legacy = /Find your dream job/i.test(page)
  const current = /<title\b[^>]*>\s*Find your next opportunity\s*\|\s*WSP\s*<\/title>/i.test(page)
    && /<link\b[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/www\.wsp\.com\/en-gl\/careers\/job-opportunities["']/i.test(page)
    && /id=["']jobscontainer["']/i.test(page)
    && extractReportedJobCount(page) != null
  return legacy || current
}

export const extractReportedJobCount = (html) => {
  const heading = extractFirst(/<h2\b[^>]*id=["']dict-title["'][^>]*>([\s\S]*?)<\/h2>/i, html)
  const value = heading?.match(/^Showing\s+([0-9,]+)\s+jobs\b/i)?.[1]
  return value == null ? null : Number.parseInt(value.replace(/,/g, ''), 10)
}

const extractCurrentPageNumber = (html) => {
  const current = String(html ?? '').match(/<div\b[^>]*class=["']pagelist current["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
  const value = current?.match(/data-value=["'](\d+)["']/i)?.[1]
  return value ? Number.parseInt(value, 10) : null
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
  const anchorPattern = /<a\b[^>]*href=(["'])(https:\/\/emit\.fa\.ca3\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_2001\/(?:requisitions\/preview\/|job\/)\d+)\1[^>]*>([\s\S]*?)<\/a>/gi

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

    if (!title || !location) {
      throw new Error('WSP India job card changed; refusing an incomplete inventory')
    }
    if (/\/sites\/CX_2001\/job\//i.test(href)) {
      const publicCountry = normalizeWhitespace(match[0]).match(/'job_country':\s*'([^']+)'/i)?.[1]
      if (publicCountry !== 'India') {
        throw new Error('WSP India current job card lacks explicit India evidence')
      }
    }

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
    detailRecord.ExternalResponsibilitiesStr,
    detailRecord.InternalResponsibilitiesStr,
    detailRecord.ExternalQualificationsStr,
  ]
    .map((value) => extractVisibleText(value))
    .filter(Boolean)

  return sections.length > 0 ? [...new Set(sections)].join('\n\n') : null
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

export const isCloudflareChallengePage = (page = {}) =>
  Number(page.status) === 403 && hasCloudflareChallengeSignal(page.html)

const mapDetailsInOrder = async (jobs, enrich) => {
  const results = new Array(jobs.length)
  let nextIndex = 0
  let failed = false
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, async () => {
    while (!failed && nextIndex < jobs.length) {
      const index = nextIndex++
      try {
        results[index] = await enrich(jobs[index])
      } catch (error) {
        failed = true
        throw error
      }
    }
  }))
  return results
}

export const createWspIndiaScraper = ({
  maxPages = null,
  maxJobs = null,
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const indiaSitePage = await fetchPage(INDIA_SITE_URL)
    if (isCloudflareChallengePage(indiaSitePage)) throw new Error('WSP India official site is unavailable behind a Cloudflare challenge')
    if (indiaSitePage.status !== 200 || !hasOfficialIndiaSiteSignal(indiaSitePage.html)) {
      throw new Error('WSP India official India site surface changed; refusing to guess the jobs handoff')
    }

    const firstJobsPage = await fetchPage(buildJobsPageUrl({ page: 1 }))
    if (isCloudflareChallengePage(firstJobsPage)) throw new Error('WSP India jobs page is unavailable behind a Cloudflare challenge')
    if (firstJobsPage.status !== 200 || !hasOfficialJobsPageSignal(firstJobsPage.html)) {
      throw new Error('WSP India official jobs page surface changed; refusing to guess job links')
    }

    const discoveredMaxPages = extractMaxPageNumber(firstJobsPage.html)
    const totalPages = Math.max(1, maxPages ? Math.min(maxPages, discoveredMaxPages) : discoveredMaxPages)
    const reportedTotal = extractReportedJobCount(firstJobsPage.html)
    const jobs = []
    const seenJobs = new Map()
    let listingRows = 0
    const pageHtmlCache = new Map([[1, firstJobsPage.html]])

    for (let page = 1; page <= totalPages; page += 1) {
      const pageResult = pageHtmlCache.has(page)
        ? { status: 200, url: buildJobsPageUrl({ page }), html: pageHtmlCache.get(page) }
        : await fetchPage(buildJobsPageUrl({ page }))
      if (isCloudflareChallengePage(pageResult)) throw new Error('WSP India jobs page is unavailable behind a Cloudflare challenge')
      if (pageResult.status !== 200 || !hasOfficialJobsPageSignal(pageResult.html)) {
        throw new Error('WSP India official jobs page surface changed; refusing an incomplete inventory')
      }
      const currentPage = extractCurrentPageNumber(pageResult.html)
      const currentTotal = extractReportedJobCount(pageResult.html)
      if ((currentPage != null && currentPage !== page) || currentTotal !== reportedTotal
        || (reportedTotal != null && discoveredMaxPages > 1
          && (currentPage == null || extractMaxPageNumber(pageResult.html) !== discoveredMaxPages))) {
        throw new Error('WSP India public inventory pagination or reported total changed')
      }
      const pageJobs = extractJobsFromHtml(pageResult.html)
      if (pageJobs.length === 0) throw new Error('WSP India public inventory has no recognized job cards')
      listingRows += pageJobs.length
      const uniquePageJobs = pageJobs.filter(job => {
        const previous = seenJobs.get(job.jobId)
        if (previous) {
          if (['title', 'location', 'sourceUrl', 'applyUrl'].some(field => previous[field] !== job[field])) {
            throw new Error('WSP India public inventory has conflicting repeated requisition cards')
          }
          return false
        }
        seenJobs.set(job.jobId, job)
        return true
      })
      if (uniquePageJobs.length === 0) throw new Error('WSP India public inventory pagination repeated a previous page')
      const selectedPageJobs = maxJobs ? uniquePageJobs.slice(0, Math.max(0, maxJobs - jobs.length)) : uniquePageJobs
      const pageDetails = await mapDetailsInOrder(selectedPageJobs, async job => {
        const detailPayload = await fetchJson(buildJobDetailsApiUrl(job.jobId))
        const detailRecords = Array.isArray(detailPayload?.items) ? detailPayload.items : []
        const detail = detailRecords[0]
        if (detailRecords.length !== 1 || String(detail?.Id) !== job.jobId
          || normalizeWhitespace(detail?.Title) !== job.title) {
          throw new Error('WSP India Oracle requisition identity changed')
        }
        if (detail.PrimaryLocationCountry !== 'IN'
          && !detail.secondaryLocations?.some(location => location.CountryCode === 'IN')) {
          throw new Error('WSP India Oracle requisition does not verify an India location')
        }
        const normalizedJob = enrichJobFromDetailRecord(job, detail)
        return {
          ...normalizedJob,
          country: 'India',
          postingDate: detail.ExternalPostedStartDate?.slice(0, 10) || null,
          closingDate: detail.ExternalPostedEndDate?.slice(0, 10) || null,
          source: SOURCE,
          link: normalizedJob.applyUrl || normalizedJob.sourceUrl,
          scrapedAt: now(),
        }
      })
      jobs.push(...pageDetails)
      if (maxJobs && jobs.length >= maxJobs) {
        return page === discoveredMaxPages && reportedTotal === listingRows
          && selectedPageJobs.length === uniquePageJobs.length
          ? jobs
          : jobs.map(job => ({ ...job, sourceListingComplete: false }))
      }

    }

    if (totalPages < discoveredMaxPages) return jobs.map(job => ({ ...job, sourceListingComplete: false }))
    if (reportedTotal != null && listingRows !== reportedTotal) {
      throw new Error('WSP India public inventory does not reconcile with the reported total')
    }
    return attachInventoryEvidence(jobs, {
      status: 'complete-inventory', surface: JOBS_PAGE_URL, firstParty: true, listingComplete: true,
      pagesFetched: totalPages, reportedTotal, indiaFacetCount: jobs.length, verifiedAt: now(),
      reason: 'official-india-all-advertised-rows-and-identical-duplicates-accounted-oracle-ids-verified',
    })
  },
})

export const run = async (options = {}) => createWspIndiaScraper(options).run(options)

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
