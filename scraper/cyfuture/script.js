import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readNativeDocument } from '../../scraper-support/utils/activeNativeHtml.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cyfuture'
export const COMPANY = 'Cyfuture'
export const VERIFIED_AT = '2026-11-03'
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

  const document = readNativeDocument(page)
  const currentIdentity = /<title>\s*GPU Cloud, AI Factories and Enterprise AI \| Cyfuture\s*<\/title>/i.test(page)
    && document.nodes(node => node.tag === 'link' && node.attrs.rel === 'canonical' && node.attrs.href === HOMEPAGE_URL).length === 1
    && document.nodes(node => node.tag === 'a' && absoluteUrl(node.attrs.href, HOMEPAGE_URL) === CAREERS_URL).length > 0

  return currentIdentity || /<title>\s*Data Centers \| Cloud Hosting \| Tech Support BPO Services[^\n<]*Cyfuture/i.test(page)
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
    && /currenttabbtn|data-bs-target=["']#[a-z]+["']/i.test(page)
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

const descendants = (node, predicate) => !node || node.inert ? [] : [
  ...(predicate(node) ? [node] : []),
  ...node.children.filter(child => typeof child !== 'string').flatMap(child => descendants(child, predicate)),
]

const extractCurrentTabCards = html => {
  const document = readNativeDocument(html)
  const tabs = document.nodes(node => node.tag === 'button' && node.attrs['data-bs-toggle'] === 'tab'
    && /^#[a-z]+$/.test(node.attrs['data-bs-target'] || ''))
  if (!tabs.length) return null
  const listings = []
  for (const tab of tabs) {
    const locationDetails = getLocationDetails(document.text(tab))
    if (!locationDetails) continue
    const panes = document.nodes(node => node.attrs.id === tab.attrs['data-bs-target'].slice(1))
    if (panes.length !== 1) throw new Error('Cyfuture advertised location tab is missing or ambiguous')
    for (const card of descendants(panes[0], node => document.hasClass(node, 'opening-card'))) {
      const anchors = descendants(card, node => node.tag === 'a' && node.attrs.href)
        .map(node => absoluteUrl(node.attrs.href, CURRENT_OPPORTUNITIES_URL))
        .filter(url => url && new URL(url).origin === new URL(CURRENT_OPPORTUNITIES_URL).origin
          && /^\/apply-job\/\d+\//.test(new URL(url).pathname))
      const title = document.text(descendants(card, node => node.tag === 'h4')[0] || { children: [] })
      // Explicit empty-location placeholders have no native role or action.
      if (!anchors.length && title === 'Coming Soon') continue
      if (anchors.length !== 1 || !title) throw new Error('Cyfuture current role card has incomplete native identity')
      const field = label => {
        const item = descendants(card, node => node.tag === 'li').find(node =>
          descendants(node, child => child.tag === 'strong').some(child => document.text(child) === label))
        const value = item && descendants(item, node => node.tag === 'span')[0]
        return value ? document.text(value) : null
      }
      const department = descendants(card, node => document.hasClass(node, 'department'))[0]
      const badge = descendants(card, node => document.hasClass(node, 'opening-badge'))[0]
      const sourceUrl = anchors[0], jobId = new URL(sourceUrl).pathname.split('/')[2]
      listings.push({ jobId, requisitionId: jobId, title,
        department: department ? document.text(department).replace(/^\(|\)$/g, '') : null,
        ...locationDetails, experienceRequired: field('Experience'),
        minimumQualification: field('Educational Qualifications'),
        openingCount: badge ? parseOpeningCount(document.text(badge)) : null,
        sourceUrl, applyUrl: UPLOAD_RESUME_URL })
    }
  }
  if (!listings.length) throw new Error('Cyfuture current public tabs contain no verified India role cards')
  return listings
}

export const extractCurrentOpportunities = (html) => {
  if (!hasCurrentOpportunitiesSignal(html)) {
    throw new Error('Cyfuture verified current opportunities page no longer matches the trusted first-party public jobs surface')
  }

  const currentCards = extractCurrentTabCards(html)
  if (currentCards) return currentCards

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
  const nativeId = String(html).match(/<title>\s*Apply for Job ID (\d+)/i)?.[1]
  if (listing.jobId && nativeId !== String(listing.jobId)) {
    throw new Error('Cyfuture verified first-party job detail has a different native role ID')
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

const defaultFetchPage = async (url, { signal } = {}) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(15000)]),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const createCyfutureScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchPage = defaultFetchPage, signal } = {}) {
    const getPage = async url => {
      signal?.throwIfAborted()
      const page = await fetchPage(url, { signal })
      signal?.throwIfAborted()
      const final = new URL(page.url), expected = new URL(url)
      if (final.protocol !== 'https:' || final.username || final.password || final.port
        || final.hostname.replace(/^www\./, '') !== 'cyfuture.com' || final.pathname !== expected.pathname) {
        throw new Error('Cyfuture public response URL no longer matches the requested employer role')
      }
      return page
    }
    const homepage = await getPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Cyfuture verified official homepage no longer matches the trusted first-party surface')
    }

    const careersPage = await getPage(CAREERS_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Cyfuture verified careers page no longer matches the trusted first-party surface')
    }

    const opportunitiesPage = await getPage(CURRENT_OPPORTUNITIES_URL)
    if (opportunitiesPage.status !== 200) throw new Error('Cyfuture public opportunities inventory unavailable')
    const listings = extractCurrentOpportunities(opportunitiesPage.html)

    const jobs = []
    for (const listing of listings) {
      const detailPage = await getPage(listing.sourceUrl)
      if (detailPage.status !== 200 || !hasJobDetailSignal(detailPage.html)) {
        throw new Error(`Cyfuture verified first-party job detail no longer matches the trusted public surface: ${listing.sourceUrl}`)
      }

      const detail = extractJobDetail(detailPage.html, listing)
      if (!detail.jobDescription || detail.jobDescription.length < 150 || !detail.requiredSkills.length) {
        throw new Error('Cyfuture verified first-party job detail has incomplete native role criteria')
      }

      jobs.push({
        ...detail,
        company: COMPANY,
        source: SOURCE,
        link: detail.applyUrl,
        scrapedAt: now(),
        sourceListingComplete: false,
        sourceScopeComplete: false,
        lifecycleCleanupAllowed: false,
      })
    }

    return attachInventoryEvidence(jobs, {
      status: 'coverage-gap', surface: CURRENT_OPPORTUNITIES_URL, firstParty: true,
      listingComplete: false, reportedTotal: null, indiaFacetCount: null,
      pagesFetched: 3 + listings.length, verifiedAt: now(),
      reason: 'current-public-tab-role-criteria;closing-inventory-and-global-scope-not-verified',
    })
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
