import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = {
  source: 'nousinfosystems',
  companyName: 'Nous Infosystems',
  officialBrandName: 'Artizent',
  adapter: 'script',
  homepageUrl: 'https://www.nousinfosystems.com/',
  legacyHomepageRedirectUrl: 'https://www.artizent.com/',
  companyCareerPage: 'https://www.artizent.com/insights/careers',
  officialOpeningsUrl: 'https://www.artizent.com/insights/careers/openings',
  companyDomain: 'artizent.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'legacy-domain-redirect-plus-first-party-careers-shell-plus-js-jobs-asset',
  extractionStrategy:
    'verified-nous-domain-redirect+verified-artizent-careers-shell+first-party-openings-assets+structured-jobs-asset',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that https://www.nousinfosystems.com/ redirects to the first-party Artizent homepage at https://www.artizent.com/, that the public careers shell remains at https://www.artizent.com/insights/careers, and that the current first-party openings flow is powered by Artizent bundle assets including https://www.artizent.com/assets/jobs-ysHR8TnP.js. The verified same-domain openings route under /insights/careers/openings/ currently exposes 14 public India jobs such as Java Full Stack Developer in Pune, Databricks Team Lead (PySpark) in Bangalore, and Senior .NET Backend Developer in Bangalore.',
}

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const LEGACY_HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const HOMEPAGE_REDIRECT_URL = PROVIDER_METADATA.legacyHomepageRedirectUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OPENINGS_URL = PROVIDER_METADATA.officialOpeningsUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const JOBS_ASSET_PATTERN = /(\/?assets\/jobs-[A-Za-z0-9_-]+\.js)/i
const OPENINGS_ASSET_PATTERN = /(\/?assets\/JobOpenings-[A-Za-z0-9_-]+\.js)/i
const DETAIL_ASSET_PATTERN = /(\/?assets\/JobDetail-[A-Za-z0-9_-]+\.js)/i

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeComparableUrl = (value) => {
  const input = String(value ?? '').trim()
  if (!input) return ''

  try {
    const url = new URL(input)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return input.replace(/\/$/, '')
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/javascript,text/javascript,text/plain;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const normalizePageText = (html) => normalizeWhitespace(
  String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const deriveIndiaCity = (location) => {
  const normalizedLocation = normalizeWhitespace(location)
  if (!normalizedLocation) return null

  return getValidIndiaCityForJob({ location: normalizedLocation })
    || normalizeCity(normalizedLocation)
    || normalizedLocation
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return /^full\s*time$/i.test(normalized) ? 'Full-time' : normalized
}

const buildDetailUrl = (slug) => new URL(
  `/insights/careers/openings/${slug}`,
  HOMEPAGE_REDIRECT_URL,
).toString()

const buildJobDescription = (record) => {
  const items = Array.isArray(record?.description)
    ? record.description.map((item) => normalizeWhitespace(item)).filter(Boolean)
    : []

  return items.length ? items.join(' ') : null
}

export const extractBundleAssetPath = (html) => {
  const match = String(html ?? '').match(
    /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']*\/assets\/index-[^"']+\.js)["']/i,
  )

  return match?.[1] ?? null
}

export const extractJobsAssetPath = (bundleText) =>
  String(bundleText ?? '').match(JOBS_ASSET_PATTERN)?.[1] ?? null

export const extractJobOpeningsAssetPath = (bundleText) =>
  String(bundleText ?? '').match(OPENINGS_ASSET_PATTERN)?.[1] ?? null

export const extractJobDetailAssetPath = (bundleText) =>
  String(bundleText ?? '').match(DETAIL_ASSET_PATTERN)?.[1] ?? null

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Artizent \(formerly known as Nous Infosystems\) \| The Engineering Partner for Mission Critical AI\s*<\/title>/i.test(rawHtml)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Artizent builds, modernizes, and operates production grade AI systems for enterprises where scale is massive, money is real, and outcomes matter\.["']/i.test(rawHtml)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']Artizent["']/i.test(rawHtml)
    && /<script src=["']\/runtime-config\.js["']><\/script>/i.test(rawHtml)
    && /<div id=["']root["']><\/div>/i.test(rawHtml)
    && extractBundleAssetPath(rawHtml) !== null
}

export const isVerifiedHomepageRedirect = (page = {}) =>
  Number(page?.status) === 200
  && normalizeComparableUrl(page?.url) === normalizeComparableUrl(HOMEPAGE_REDIRECT_URL)
  && hasOfficialHomepageSignal(page?.html)

export const routeMatchesVerifiedShell = (html, bundlePath) =>
  hasOfficialHomepageSignal(html)
  && extractBundleAssetPath(html) === bundlePath

export const hasVerifiedJobOpeningsAssetSignal = (assetText) => {
  const text = String(assetText ?? '')

  return /Back to Careers/i.test(text)
    && /Open Positions/i.test(text)
    && /Select Designation/i.test(text)
    && /Select Location/i.test(text)
    && /\/insights\/careers/i.test(text)
    && /\/insights\/careers\/openings\/\$\{t\.slug\}/.test(text)
}

export const hasVerifiedJobDetailAssetSignal = (assetText) => {
  const text = String(assetText ?? '')

  return /\/api\/apply/i.test(text)
    && /Application received/i.test(text)
    && /\.pdf,\.doc,\.docx/i.test(text)
    && /Full name is required/i.test(text)
    && /Resume is required/i.test(text)
}

export const extractJobsFromAssetText = (assetText) => {
  const text = String(assetText ?? '')
  const match = text.match(/^\s*const\s+\w+\s*=\s*(\[[\s\S]*\])\s*;\s*export\s*\{/)

  if (!match?.[1]) {
    throw new Error('Nous Infosystems jobs asset no longer matches the verified exported array contract')
  }

  const records = Function(`"use strict"; return (${match[1]});`)()
  if (!Array.isArray(records)) {
    throw new Error('Nous Infosystems jobs asset no longer evaluates to a jobs array')
  }

  return records
    .map((record) => {
      const slug = normalizeWhitespace(record?.slug)
      const title = normalizeWhitespace(record?.title)
      const department = normalizeWhitespace(record?.team)
      const location = normalizeWhitespace(record?.location)
      const city = deriveIndiaCity(location)

      if (!slug || !title || !location || !city) {
        return null
      }

      return {
        slug,
        title,
        department,
        location,
        city,
        openings: Number.isFinite(record?.openings) ? record.openings : null,
        employmentType: normalizeEmploymentType(record?.type),
        experienceRequired: normalizeWhitespace(record?.experience),
        requiredSkills: Array.isArray(record?.skills)
          ? record.skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
          : [],
        jobDescription: buildJobDescription(record),
      }
    })
    .filter(Boolean)
}

const mapRecordToJob = (record, scrapedAt) => {
  const detailUrl = buildDetailUrl(record.slug)

  return {
    title: record.title,
    company: COMPANY,
    department: record.department,
    location: record.location,
    city: record.city,
    country: 'India',
    jobId: record.slug,
    requisitionId: record.slug,
    sourceUrl: detailUrl,
    applyUrl: detailUrl,
    employmentType: record.employmentType,
    experienceRequired: record.experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: record.requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: record.jobDescription,
    remoteStatus: 'On-site',
    source: SOURCE,
    link: detailUrl,
    companyCareerPage: OPENINGS_URL,
    companyDomain: PROVIDER_METADATA.companyDomain,
    atsPlatform: PROVIDER_METADATA.atsPlatform,
    scrapedAt,
  }
}

export const createNousInfosystemsScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchText = defaultFetchText,
    now = defaultNow,
  } = {}) {
    const homepage = await fetchPage(LEGACY_HOMEPAGE_URL)

    if (!isVerifiedHomepageRedirect(homepage)) {
      throw new Error('Nous Infosystems legacy homepage redirect no longer matches the verified first-party surface')
    }

    const bundleAssetPath = extractBundleAssetPath(homepage.html)
    if (!bundleAssetPath) {
      throw new Error('Nous Infosystems redirected homepage no longer exposes the verified client bundle')
    }

    const careersRoute = await fetchPage(CAREERS_URL)
    if (
      careersRoute.status !== 200
      || normalizeComparableUrl(careersRoute.url) !== normalizeComparableUrl(CAREERS_URL)
      || !routeMatchesVerifiedShell(careersRoute.html, bundleAssetPath)
    ) {
      throw new Error('Nous Infosystems Artizent careers route changed materially')
    }

    const bundleUrl = new URL(bundleAssetPath, HOMEPAGE_REDIRECT_URL).toString()
    const bundleText = await fetchText(bundleUrl)

    const jobOpeningsAssetPath = extractJobOpeningsAssetPath(bundleText)
    const jobDetailAssetPath = extractJobDetailAssetPath(bundleText)
    const jobsAssetPath = extractJobsAssetPath(bundleText)

    if (!jobOpeningsAssetPath || !jobDetailAssetPath || !jobsAssetPath) {
      throw new Error('Nous Infosystems verified Artizent client bundle no longer exposes the openings assets contract')
    }

    const [jobOpeningsAssetText, jobDetailAssetText, jobsAssetText] = await Promise.all([
      fetchText(new URL(jobOpeningsAssetPath, HOMEPAGE_REDIRECT_URL).toString()),
      fetchText(new URL(jobDetailAssetPath, HOMEPAGE_REDIRECT_URL).toString()),
      fetchText(new URL(jobsAssetPath, HOMEPAGE_REDIRECT_URL).toString()),
    ])

    if (!hasVerifiedJobOpeningsAssetSignal(jobOpeningsAssetText)) {
      throw new Error('Nous Infosystems Artizent openings asset changed materially')
    }

    if (!hasVerifiedJobDetailAssetSignal(jobDetailAssetText)) {
      throw new Error('Nous Infosystems Artizent job detail asset changed materially')
    }

    const jobs = extractJobsFromAssetText(jobsAssetText)
    if (jobs.length === 0) {
      throw new Error('Nous Infosystems Artizent jobs asset no longer exposes public India openings')
    }

    const scrapedAt = now()
    return jobs.map((record) => mapRecordToJob(record, scrapedAt))
  },
})

export const run = async (options = {}) => createNousInfosystemsScraper().run(options)

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
