import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cyfuture'
export const COMPANY = 'Cyfuture'
export const VERIFIED_AT = '2026-07-14'
export const HOMEPAGE_URL = 'https://cyfuture.com/'
export const CAREERS_URL = 'https://cyfuture.com/careers.html'
export const CURRENT_OPPORTUNITIES_URL = 'https://cyfuture.com/current-opportunities.html'
export const UPLOAD_RESUME_URL = 'https://www.cyfuture.com/upload-resume.html'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const LOCATION_DETAILS = {
  noida: {
    city: 'Noida',
    country: 'India',
    location: 'Noida, Uttar Pradesh, India',
  },
  mumbai: {
    city: 'Mumbai',
    country: 'India',
    location: 'Mumbai, Maharashtra, India',
  },
  banglore: {
    city: 'Bangalore',
    country: 'India',
    location: 'Bangalore, Karnataka, India',
  },
  bangalore: {
    city: 'Bangalore',
    country: 'India',
    location: 'Bangalore, Karnataka, India',
  },
  jaipur: {
    city: 'Jaipur',
    country: 'India',
    location: 'Jaipur, Rajasthan, India',
  },
  kolkata: {
    city: 'Kolkata',
    country: 'India',
    location: 'Kolkata, West Bengal, India',
  },
  chennai: {
    city: 'Chennai',
    country: 'India',
    location: 'Chennai, Tamil Nadu, India',
  },
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/ï‚·||•/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTagsToLines = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(li|p|div|tr|table|ul|ol|h[1-6])>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n')
  .replace(/<td\b[^>]*>/gi, ' ')
  .replace(/<th\b[^>]*>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const absoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? transform(match) : null
}

const normalizeLocationLabel = (value) => normalizeWhitespace(value)?.toLowerCase() || null

export const isIndiaLocationLabel = (value) =>
  Object.hasOwn(LOCATION_DETAILS, normalizeLocationLabel(value) || '')

const getLocationDetails = (value) => {
  const key = normalizeLocationLabel(value)
  return key ? LOCATION_DETAILS[key] || null : null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Data Centers \| Cloud Hosting \| Tech Support BPO Services[^\n<]*Cyfuture/i.test(page)
    && /Be A Techvolutionary @ Cyfuture/i.test(page)
    && /href=["']https:\/\/cyfuture\.com\/careers\.html["']/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Cyfuture Careers \| A Place for People Who Love Innovation \| Join Us\s*<\/title>/i.test(page)
    && /Current Opportunities/i.test(page)
    && /href=["']current-opportunities\.html["']/i.test(page)
    && /be a part of our/i.test(page)
}

export const hasCurrentOpportunitiesSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Career Opportunities at Cyfuture\s*<\/title>/i.test(page)
    && /Current Opening'?s/i.test(page)
    && /currenttabbtn/i.test(page)
    && /apply-job\/\d+\//i.test(page)
    && /upload-resume\.html/i.test(page)
}

export const hasJobDetailSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Apply for Job ID \d+/i.test(page)
    && /<h2>\s*Job Title\s*<\/h2>/i.test(page)
    && /<h2>\s*Job Responsibilities\s*<\/h2>/i.test(page)
    && /<h2>\s*Skill Requirement\s*<\/h2>/i.test(page)
    && /upload-resume\.html/i.test(page)
}

export const extractLocationTabs = (html) => [...String(html ?? '').matchAll(
  /<a[^>]+data-toggle=["']pill["'][^>]+href=["']#([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
)].map((match) => ({
  paneId: normalizeWhitespace(match[1]),
  label: normalizeWhitespace(match[2]),
})).filter((tab) => tab.paneId && tab.label)

const extractPaneHtmlById = (html, paneId) => {
  const source = String(html ?? '')
  const markers = [...source.matchAll(/<div class="tab-pane fade(?: in active)?" id="([^"]+)"\s*>/gi)]
  const targetIndex = markers.findIndex((match) => normalizeWhitespace(match[1]) === paneId)

  if (targetIndex === -1) return ''

  const start = (markers[targetIndex].index ?? 0) + markers[targetIndex][0].length
  const end = targetIndex + 1 < markers.length
    ? markers[targetIndex + 1].index ?? source.length
    : source.indexOf('<!--03072021-->', start) !== -1
      ? source.indexOf('<!--03072021-->', start)
      : source.length

  return source.slice(start, end)
}

const extractCardBlocks = (paneHtml) => [...String(paneHtml ?? '').matchAll(
  /<div class="current-fulbox">([\s\S]*?)<\/div>\s*<\/div>/gi,
)].map((match) => match[1])

const parseOpeningCount = (value) => {
  const count = extractFirst(/(\d+)/, value, (match) => Number.parseInt(match[1], 10))
  return Number.isInteger(count) ? count : null
}

const parseListingCard = (cardHtml, locationLabel) => {
  const title = normalizeWhitespace(extractFirst(/<h2>([\s\S]*?)<\/h2>/i, cardHtml))
  const department = normalizeWhitespace(extractFirst(
    /<p class=["'][^"']*\bcurrentborder\b[^"']*["']>\s*\(([\s\S]*?)\)\s*<\/p>/i,
    cardHtml,
  ))
  const experienceRequired = normalizeWhitespace(extractFirst(
    /Experience<\/strong><br\s*\/?>\s*([\s\S]*?)<\/p>/i,
    cardHtml,
  ))
  const minimumQualification = normalizeWhitespace(extractFirst(
    /Educational Qualifications<\/strong><br\s*\/?>\s*([\s\S]*?)<\/p>/i,
    cardHtml,
  ))
  const detailHref = normalizeWhitespace(extractFirst(
    /<a[^>]+href=["']([^"']*apply-job\/\d+\/[^"']+)["'][^>]*>\s*View Details\s*<\/a>/i,
    cardHtml,
  ))
  const jobId = normalizeWhitespace(extractFirst(/apply-job\/(\d+)\//i, detailHref))
  const openingCount = parseOpeningCount(extractFirst(
    /<span class=["'][^"']*\bopningbtn\b[^"']*["']>([\s\S]*?)<\/span>/i,
    cardHtml,
  ))
  const locationDetails = getLocationDetails(locationLabel)

  if (!title || !detailHref || !jobId || !locationDetails) return null

  return {
    jobId,
    requisitionId: jobId,
    title,
    department,
    location: locationDetails.location,
    city: locationDetails.city,
    country: locationDetails.country,
    experienceRequired,
    minimumQualification,
    openingCount,
    sourceUrl: absoluteUrl(detailHref, CURRENT_OPPORTUNITIES_URL),
    applyUrl: UPLOAD_RESUME_URL,
  }
}

export const extractCurrentOpportunities = (html) => {
  if (!hasCurrentOpportunitiesSignal(html)) {
    throw new Error('Cyfuture verified current opportunities page no longer matches the trusted first-party public jobs surface')
  }

  const listings = []
  const tabs = extractLocationTabs(html)

  for (const tab of tabs) {
    if (!isIndiaLocationLabel(tab.label)) continue

    const paneHtml = extractPaneHtmlById(html, tab.paneId)
    for (const cardHtml of extractCardBlocks(paneHtml)) {
      const listing = parseListingCard(cardHtml, tab.label)
      if (listing) listings.push(listing)
    }
  }

  if (listings.length === 0) {
    throw new Error('Cyfuture verified current opportunities page no longer exposes India job cards')
  }

  return listings
}

const extractDetailSections = (html) => [...String(html ?? '').matchAll(
  /<div class="col-sm-12 col-md-12 col-xs-12 opportunitylist">\s*(?:<h2>([\s\S]*?)<\/h2>)?([\s\S]*?)<\/div>/gi,
)].reduce((sections, match) => {
  const heading = normalizeWhitespace(match[1])
  if (!heading) return sections

  sections[heading] = match[2]
  return sections
}, {})

const buildDescription = (sections) => {
  const parts = [
    ['Job Responsibilities', sections['Job Responsibilities']],
    ['Skill Requirement', sections['Skill Requirement']],
    ['Perks and Benefits', sections['Perks and Benefits']],
  ].map(([heading, value]) => {
    const lines = stripTagsToLines(value)
    return lines.length > 0 ? `${heading}: ${lines.join(' ')}` : null
  }).filter(Boolean)

  return parts.join('\n\n') || null
}

export const extractJobDetail = (html, listing = {}) => {
  if (!hasJobDetailSignal(html)) {
    throw new Error('Cyfuture verified first-party job detail no longer matches the trusted public job surface')
  }

  const sections = extractDetailSections(html)
  const titleLines = stripTagsToLines(sections['Job Title'])
  const requiredSkills = stripTagsToLines(sections['Skill Requirement'])
  const applyUrl = absoluteUrl(extractFirst(
    /<a[^>]+href=["']([^"']*upload-resume\.html[^"']*)["'][^>]*>\s*Apply Now\s*<\/a>/i,
    html,
  ), listing.sourceUrl || CURRENT_OPPORTUNITIES_URL)

  if (!applyUrl || !/upload-resume\.html/i.test(applyUrl)) {
    throw new Error('Cyfuture verified first-party job detail no longer points to the shared upload resume apply page')
  }

  return {
    jobId: listing.jobId || null,
    requisitionId: listing.requisitionId || listing.jobId || null,
    title: titleLines[0] || listing.title || null,
    department: listing.department || null,
    location: listing.location || null,
    city: listing.city || null,
    country: listing.country || 'India',
    employmentType: null,
    experienceRequired: listing.experienceRequired || null,
    minimumQualification: listing.minimumQualification || null,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: buildDescription(sections),
    applyUrl,
    sourceUrl: listing.sourceUrl || null,
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const createCyfutureScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Cyfuture verified official homepage no longer matches the trusted first-party surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Cyfuture verified careers page no longer matches the trusted first-party surface')
    }

    const opportunitiesPage = await fetchPage(CURRENT_OPPORTUNITIES_URL)
    const listings = extractCurrentOpportunities(opportunitiesPage.html)

    const jobs = []
    for (const listing of listings) {
      const detailPage = await fetchPage(listing.sourceUrl)
      if (detailPage.status !== 200 || !hasJobDetailSignal(detailPage.html)) {
        throw new Error(`Cyfuture verified first-party job detail no longer matches the trusted public surface: ${listing.sourceUrl}`)
      }

      const detail = extractJobDetail(detailPage.html, listing)

      jobs.push({
        ...detail,
        company: COMPANY,
        source: SOURCE,
        link: detail.applyUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createCyfutureScraper().run(options)

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
