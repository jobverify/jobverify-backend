import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { APEXON_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = APEXON_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const EXPLORE_JOBS_URL = PROVIDER_METADATA.exploreJobsUrl

const decodeHtmlEntities = (value) =>
  String(value ?? '')
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;|&#038;/gi, '&')
    .replace(/&quot;|&#34;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&#8217;|&rsquo;|&#x27;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8212;|&mdash;/gi, '—')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) =>
  decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const stripTags = (value) =>
  normalizeWhitespace(
    String(value ?? '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, ' '),
  )

const extractMatch = (value, pattern) => String(value ?? '').match(pattern)?.[1] ?? null

const toAbsoluteUrl = (value) => {
  try {
    return new URL(decodeHtmlEntities(value), HOMEPAGE_URL).toString()
  } catch {
    return null
  }
}

const getCityFromLocation = (location) => normalizeText(location?.split(',')[0])

const extractDescriptionHtml = (html) =>
  extractMatch(
    html,
    /<div class="jobcontent">([\s\S]*?)<div class="footercontactform customcareerform">/i,
  )

const extractListItems = (html) =>
  [...String(html ?? '').matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

const extractDescriptionLines = (html) =>
  decodeHtmlEntities(String(html ?? ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean)

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Apexon - Enterprise AI, Data (?:&amp;|&) Digital Engineering Solutions\s*<\/title>/i.test(page)
    && text.includes('Peak Ingenuity')
    && (
      /href=["']\/about\/careers\/["']/i.test(page)
      || /href=["']https:\/\/www\.apexon\.com\/about\/careers\/["']/i.test(page)
    )
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Apexon Careers (?:&amp;|&) Work Culture and Values - Apexon\s*<\/title>/i.test(page)
    && text.includes('Careers')
    && text.includes('click here to view')
    && /href=["']\/explore-jobs\/["']/i.test(page)
}

export const extractExploreJobsUrl = (html) =>
  toAbsoluteUrl(
    extractMatch(
      html,
      /<a[^>]+href=["']([^"']*\/explore-jobs\/?)["'][^>]*>\s*click here to view\s*<\/a>/i,
    ),
  )

export const hasOfficialExploreJobsSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Job Search, Job Opportunities (?:&amp;|&) Openings in India - Apexon\s*<\/title>/i.test(page)
    && text.includes('Explore Jobs')
    && text.includes('Job Title')
    && text.includes('Openings')
    && text.includes('Location')
    && /career-job-detail\/\?id=0&amp;jobid=\d+/i.test(page)
    && text.includes('Find out more')
}

export const extractListingCards = (html) =>
  [...String(html ?? '').matchAll(
    /<div class="table_row">[\s\S]*?<div class="table_small jobTitle">[\s\S]*?<a href="([^"]*career-job-detail\/\?id=0&amp;jobid=(\d+))" title="([^"]+)">[\s\S]*?<\/a>[\s\S]*?<div class="table_small openPosiTitle">[\s\S]*?<a [^>]*>(\d+)<\/a>[\s\S]*?<div class="table_small locationTitle">[\s\S]*?<a [^>]*>([^<]+)<\/a>[\s\S]*?Find out more[\s\S]*?<\/div>\s*<\/div>/gi,
  )]
    .map((match) => ({
      title: normalizeText(match[3]),
      requisitionId: normalizeText(match[2]),
      openings: normalizeText(match[4]),
      location: normalizeText(match[5]),
      sourceUrl: toAbsoluteUrl(match[1]),
    }))
    .filter((listing) =>
      listing.title
      && listing.requisitionId
      && listing.openings
      && listing.location
      && listing.sourceUrl)

export const hasOfficialDetailPageSignal = (html) => {
  const page = String(html ?? '')

  return /Career Job Detail/i.test(page)
    && /<h1 class="jobtitle dtitle text-left">[\s\S]*?<\/h1>/i.test(page)
    && /Job Reference No#:/i.test(page)
    && /Open Positions:/i.test(page)
    && /href=["']https:\/\/apexon\.talentrecruit\.com\/career-page\/apply\/[^"']+["']/i.test(page)
    && /<div class="jobcontent">/i.test(page)
}

const extractDetailPageData = (html, listing) => {
  if (!hasOfficialDetailPageSignal(html)) {
    throw new Error('Apexon detail page no longer matches the verified first-party surface')
  }

  const title = normalizeText(
    extractMatch(html, /<h1 class="jobtitle dtitle text-left">([\s\S]*?)<\/h1>/i) || listing.title,
  )
  const applyUrl = toAbsoluteUrl(
    extractMatch(
      html,
      /<a class="btn btn-primary print" href="([^"]*apexon\.talentrecruit\.com\/career-page\/apply\/[^"]+)"[^>]*>\s*Apply\s*<\/a>/i,
    ),
  )
  const descriptionHtml = extractDescriptionHtml(html)
  const descriptionLines = extractDescriptionLines(descriptionHtml)
  const requiredSkills = extractListItems(descriptionHtml)

  if (!title || !applyUrl || !descriptionHtml || descriptionLines.length === 0) {
    throw new Error('Apexon detail page no longer matches the verified first-party surface')
  }

  return {
    title,
    company: COMPANY,
    department: null,
    location: listing.location,
    city: getCityFromLocation(listing.location),
    country: 'India',
    jobId: `${SOURCE}-${listing.requisitionId}`,
    requisitionId: listing.requisitionId,
    sourceUrl: listing.sourceUrl,
    applyUrl,
    employmentType: null,
    workplaceType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills,
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: descriptionLines.join('\n'),
    companyCareerPage: CAREERS_URL,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  label: SOURCE,
  timeoutMs: 15000,
})

export const createApexonScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Apexon verified official homepage no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Apexon verified careers page no longer matches the trusted first-party surface')
    }

    const exploreJobsUrl = extractExploreJobsUrl(careersHtml)
    if (exploreJobsUrl !== EXPLORE_JOBS_URL) {
      throw new Error('Apexon verified careers page no longer links to the expected explore-jobs surface')
    }

    const exploreJobsHtml = await fetchText(EXPLORE_JOBS_URL)
    if (!hasOfficialExploreJobsSignal(exploreJobsHtml)) {
      throw new Error('Apexon verified explore-jobs page no longer matches the trusted first-party surface')
    }

    const listings = extractListingCards(exploreJobsHtml)
    if (listings.length === 0) {
      throw new Error('Apexon explore-jobs page no longer exposes verified first-party listing rows')
    }

    const jobs = []
    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      jobs.push(extractDetailPageData(detailHtml, listing))
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createApexonScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
