import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { MYNTRA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = MYNTRA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_LANDING_URL = PROVIDER_METADATA.officialCareersLandingUrl
export const JOB_PORTAL_URL = PROVIDER_METADATA.companyCareerPage
export const PUBLIC_API_ORIGIN = 'https://io.spire2grow.com/ies/v1/p'
export const JOBS_DOMAIN = 'jobs.myntra.com'
export const DEFAULT_PAGE_SIZE = 6

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeIsoDate = (value) => {
  const text = normalizeWhitespace(value)
  if (!text) return null

  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(text)
  return isoMatch ? isoMatch[1] : text
}

const isIndiaLocation = (value) => /(?:^|[^a-z])india(?:[^a-z]|$)/i.test(value ?? '')

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || normalized
}

const formatYears = (months) => {
  if (!Number.isFinite(months)) return null
  const years = months / 12
  return Number.isInteger(years) ? String(years) : String(Number(years.toFixed(1)))
}

const formatExperienceRange = (value = {}) => {
  const from = Number(value?.from)
  const to = Number(value?.to)
  const fromYears = formatYears(from)
  const toYears = formatYears(to)

  if (fromYears && toYears && fromYears !== toYears) {
    return `${fromYears}-${toYears} years`
  }
  if (fromYears && toYears && fromYears === toYears) {
    return `${fromYears} years`
  }
  if (fromYears) {
    return `${fromYears}+ years`
  }
  if (toYears) {
    return `Up to ${toYears} years`
  }

  return null
}

const buildPublicApiHeaders = ({ workspaceId } = {}) => ({
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://jobs.myntra.com',
  Referer: JOB_PORTAL_URL,
  'User-Agent': USER_AGENT,
  ...(workspaceId ? { WorkspaceId: workspaceId } : {}),
})

const defaultFetchText = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const buildWorkspaceBootstrapUrl = (domain = JOBS_DOMAIN) =>
  `${PUBLIC_API_ORIGIN}/workspaceId?domain=${encodeURIComponent(domain)}`

export const buildJobsCountUrl = () => `${PUBLIC_API_ORIGIN}/requisition/_count`

export const buildJobsSearchUrl = ({
  page = 1,
  size = DEFAULT_PAGE_SIZE,
  sortOrder = 'desc',
  sortField = 'postedOn',
} = {}) =>
  `${PUBLIC_API_ORIGIN}/requisition/_search?page=${page}&size=${size}&selectedSortOrder=${sortOrder}&selectedSortField=${sortField}`

export const buildJobUrl = (displayId, workspaceId) =>
  `https://jobs.myntra.com/jobs/${encodeURIComponent(displayId)}?tenantId=${encodeURIComponent(workspaceId)}&ref=job-share-direct-link`

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /https:\/\/careers\.myntra\.com/i.test(rawHtml)
    && /myntra/i.test(rawHtml)
}

export const hasVerifiedCareersLandingSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /explore careers/i.test(rawHtml)
    && /https:\/\/jobs\.myntra\.com\/home/i.test(rawHtml)
}

export const hasVerifiedJobsPortalSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Career Portal\s*<\/title>/i.test(rawHtml)
    && /flutter/i.test(rawHtml)
}

export const extractWorkspaceId = (value) => {
  const workspaceId = normalizeWhitespace(value)

  if (!/^MYNTRA-[A-Za-z0-9]+$/.test(workspaceId ?? '')) {
    throw new Error('Myntra verified public workspace ID no longer matches the expected contract')
  }

  return workspaceId
}

export const extractTotalCount = (payload = {}) => {
  const totalCount = Number.parseInt(String(payload?.totalCount ?? ''), 10)

  if (!Number.isFinite(totalCount)) {
    throw new Error('Myntra verified public requisition count no longer exposes totalCount')
  }

  return totalCount
}

export const extractIndiaJobsFromSearchPayload = (
  payload = {},
  {
    workspaceId,
    scrapedAt = new Date().toISOString(),
  } = {},
) => {
  if (!Array.isArray(payload?.entities)) {
    throw new Error('Myntra verified public requisition search no longer exposes entities')
  }

  return payload.entities
    .map((entity) => {
      const location = normalizeWhitespace(entity?.jobLocation?.[0]?.fqLocationName)
      const displayId = normalizeWhitespace(entity?.displayId)
      const requisitionId = normalizeWhitespace(entity?.id)
      const effectiveWorkspaceId = normalizeWhitespace(workspaceId)
        || normalizeWhitespace(entity?.workspaceId)
      const status = normalizeWhitespace(entity?.jobStatus?.statusCode || entity?.jobPosting?.status)

      if (
        !displayId
        || !requisitionId
        || !effectiveWorkspaceId
        || !location
        || !isIndiaLocation(location)
        || (status && !/^(open|active)$/i.test(status))
      ) {
        return null
      }

      const jobDescription = [
        stripHtml(entity?.jobDescription),
        stripHtml(entity?.aboutCompany),
      ]
        .filter(Boolean)
        .join(' ')

      const requiredSkills = [...new Set(
        (Array.isArray(entity?.skills) ? entity.skills : [])
          .map((skill) => normalizeWhitespace(skill?.skill))
          .filter(Boolean),
      )]

      const link = buildJobUrl(displayId, effectiveWorkspaceId)

      return {
        title: normalizeWhitespace(entity?.jobTitle),
        company: COMPANY,
        department: normalizeWhitespace(entity?.departmentName),
        location,
        city: extractCity(location),
        country: 'India',
        workplaceType: normalizeWhitespace(entity?.jobType),
        jobId: displayId,
        requisitionId,
        sourceUrl: link,
        applyUrl: link,
        link,
        employmentType: normalizeWhitespace(entity?.employmentType),
        experienceRequired: formatExperienceRange(entity?.requiredExperienceInMonths),
        requiredSkills,
        postingDate: normalizeIsoDate(
          entity?.jobPosting?.startDate || entity?.createdOn || entity?.updatedOn,
        ),
        jobDescription: jobDescription || null,
        source: SOURCE,
        scrapedAt,
      }
    })
    .filter((job) => job?.title && job?.jobId)
}

export const createMyntraScraper = ({
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
    maxPages = 100,
    maxJobs = null,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('The verified Myntra homepage no longer matches the known first-party careers link surface')
    }

    const careersLandingHtml = await fetchText(CAREERS_LANDING_URL)
    if (!hasVerifiedCareersLandingSignal(careersLandingHtml)) {
      throw new Error('The verified Myntra careers landing page no longer matches the known first-party jobs handoff')
    }

    const jobsPortalHtml = await fetchText(JOB_PORTAL_URL)
    if (!hasVerifiedJobsPortalSignal(jobsPortalHtml)) {
      throw new Error('The verified Myntra jobs portal no longer matches the known first-party public portal shell')
    }

    const workspaceId = extractWorkspaceId(
      await fetchText(buildWorkspaceBootstrapUrl(), {
        headers: buildPublicApiHeaders(),
      }),
    )

    let totalCount = null
    try {
      totalCount = extractTotalCount(
        await fetchJson(buildJobsCountUrl(), {
          method: 'GET',
          headers: buildPublicApiHeaders({ workspaceId }),
        }),
      )
    } catch {
      totalCount = null
    }

    const jobs = []
    const totalPages = totalCount
      ? Math.min(Math.ceil(totalCount / pageSize), maxPages)
      : maxPages
    const scrapedAt = now()

    for (let page = 1; page <= totalPages; page += 1) {
      const payload = await fetchJson(buildJobsSearchUrl({ page, size: pageSize }), {
        method: 'GET',
        headers: buildPublicApiHeaders({ workspaceId }),
      })
      const pageJobs = extractIndiaJobsFromSearchPayload(payload, {
        workspaceId,
        scrapedAt,
      })

      jobs.push(...pageJobs)

      if (maxJobs && jobs.length >= maxJobs) {
        return jobs.slice(0, maxJobs)
      }

      if (!totalCount) {
        const entityCount = Array.isArray(payload?.entities) ? payload.entities.length : 0
        if (entityCount < pageSize) break
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createMyntraScraper().run(options)

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
