import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FLEETX_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = FLEETX_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const WWW_HOMEPAGE_URL = PROVIDER_METADATA.wwwHomepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WWW_CAREERS_URL = PROVIDER_METADATA.wwwCareerPageUrl
export const ROBOTS_URL = PROVIDER_METADATA.robotsUrl
export const WWW_ROBOTS_URL = PROVIDER_METADATA.wwwRobotsUrl
export const SITEMAP_URL = PROVIDER_METADATA.sitemapUrl
export const WWW_SITEMAP_URL = PROVIDER_METADATA.wwwSitemapUrl
export const TIMEOUT_PROBE_URLS = PROVIDER_METADATA.timeoutProbeUrls
export const CURRENT_CAREERS_URL = 'https://www.fleetx.ai/careers'

export const HOMEPAGE_ROUTE_URLS = [
  HOMEPAGE_URL,
  WWW_HOMEPAGE_URL,
]

export const CAREERS_ROUTE_URLS = [
  CAREERS_URL,
  WWW_CAREERS_URL,
  'https://fleetx.io/career',
  'https://www.fleetx.io/career',
  'https://fleetx.io/jobs',
  'https://www.fleetx.io/jobs',
  'https://fleetx.io/join-us',
  'https://www.fleetx.io/join-us',
  'https://fleetx.io/work-with-us',
  'https://www.fleetx.io/work-with-us',
]

export const DISCOVERY_ROUTE_URLS = [
  ROBOTS_URL,
  WWW_ROBOTS_URL,
  SITEMAP_URL,
  WWW_SITEMAP_URL,
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value) => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => stripTags(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toArray = (value) => stripTags(value)
  .split(/\s*,\s*/)
  .map((item) => item.trim())
  .filter(Boolean)

const extractTitle = (html = '') =>
  stripTags(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const isFleetxFirstPartyUrl = (value) => {
  try {
    const host = new URL(value || CURRENT_CAREERS_URL).hostname.toLowerCase()
    return host === 'fleetx.io' || host === 'www.fleetx.io' || host === 'fleetx.ai' || host === 'www.fleetx.ai'
  } catch {
    return false
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const text = stripTags(html)

  return extractTitle(html) === 'Career Opportunities At Fleetx | Fleetx'
    && text.includes('Current Openings')
    && text.includes('Please email your resume to talent@fleetx.io')
    && /id=["']current-openings["']/i.test(String(html ?? ''))
}

const extractField = (block, label) => {
  const match = String(block ?? '').match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?:<\\/p>|$)`, 'i'))
  return stripTags(match?.[1])
}

export const extractFleetxJobs = (html = '') => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Fleetx careers page no longer matches the verified first-party public jobs surface')
  }

  const jobs = []
  const cards = String(html ?? '').matchAll(
    /<div[^>]+class=["'][^"']*flex flex-col items-start text-left rounded bg-white p-6 shadow[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  )

  for (const card of cards) {
    const block = card[1]
    const title = stripTags(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const experienceRequired = extractField(block, 'Minimum Exp\\.')
    const requiredSkills = toArray(extractField(block, 'Key Skills'))
    const locations = toArray(extractField(block, 'Location'))
    const jobId = slugify(`${SOURCE}-${title}`)

    if (!title || !jobId || locations.length === 0) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: `${locations.join(', ')}, India`,
      city: locations[0],
      state: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CURRENT_CAREERS_URL,
      applyUrl: CURRENT_CAREERS_URL,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills,
      postingDate: null,
      closingDate: null,
      jobDescription: requiredSkills.length > 0
        ? `Key Skills: ${requiredSkills.join(', ')}. Apply by emailing talent@fleetx.io.`
        : 'Apply by emailing talent@fleetx.io.',
      remoteStatus: 'On-site',
    })
  }

  if (jobs.length === 0) {
    throw new Error('Fleetx careers page no longer exposes public opening cards')
  }

  return jobs
}

const normalizeUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''

    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }

    return url.toString()
  } catch {
    return String(value ?? '').trim()
  }
}

export const isVerifiedTimeoutResult = (result = {}, requestedUrl = '') => {
  if (result?.ok !== false) {
    return false
  }

  if (normalizeUrl(result?.url ?? requestedUrl) !== normalizeUrl(requestedUrl)) {
    return false
  }

  const errorName = String(result?.errorName ?? '')
  const errorMessage = String(result?.errorMessage ?? '')
  const causeName = String(result?.causeName ?? '')
  const causeMessage = String(result?.causeMessage ?? '')
  const combined = `${errorName} ${errorMessage} ${causeName} ${causeMessage}`.toLowerCase()

  return combined.includes('timeout')
}

const defaultFetchPage = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })

    return {
      ok: true,
      status: response.status,
      url: response.url,
      html: await response.text(),
    }
  } catch (error) {
    return {
      ok: false,
      url,
      errorName: error?.name ?? 'Error',
      errorMessage: error?.message ?? String(error),
      causeName: error?.cause?.constructor?.name ?? null,
      causeMessage: error?.cause?.message ?? null,
    }
  }
}

const assertTimeoutRoutes = (results, routeUrls, routeLabel) => {
  for (const routeUrl of routeUrls) {
    const result = results.get(routeUrl)

    if (!isVerifiedTimeoutResult(result, routeUrl)) {
      throw new Error(`Fleetx ${routeLabel} changed materially or became reachable: ${routeUrl}`)
    }
  }
}

export const createFleetxScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    now = () => new Date().toISOString(),
  } = {}) {
    const resultEntries = await Promise.all(
      TIMEOUT_PROBE_URLS.map(async (url) => [url, await fetchPage(url)]),
    )
    const results = new Map(resultEntries)
    const careersPage = results.get(CAREERS_URL)

    if (
      careersPage?.status === 200
      && isFleetxFirstPartyUrl(careersPage.url)
      && hasOfficialCareersSignal(careersPage.html)
    ) {
      return extractFleetxJobs(careersPage.html).map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      }))
    }

    assertTimeoutRoutes(results, HOMEPAGE_ROUTE_URLS, 'homepage route')
    assertTimeoutRoutes(results, CAREERS_ROUTE_URLS, 'careers route')
    assertTimeoutRoutes(results, DISCOVERY_ROUTE_URLS, 'discovery route')

    return []
  },
})

export const run = async (options = {}) => createFleetxScraper().run(options)

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
