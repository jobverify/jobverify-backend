import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'safrandatasystems'
export const COMPANY = 'Safran Data Systems'
export const COMPANY_FILTER_VALUE = '609-safran-data-systems'
export const COMPANY_PAGE_URL = 'https://www.safran-group.com/fr/societes/safran-data-systems'
export const FILTERED_JOBS_URL = `https://www.safran-group.com/fr/offres?companies%5B%5D=${COMPANY_FILTER_VALUE}`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const SAFRAN_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value, baseUrl = COMPANY_PAGE_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const normalizeHost = (value) => String(value || '').replace(/^www\./i, '').toLowerCase()

export const shouldUseBrowserFallback = (error) =>
  /HTTP (?:403|429)\b|attention required!|just a moment|cloudflare|captcha|challenge|access denied|blocked/i
    .test(String(error?.message ?? error ?? ''))

export const urlTargetsExactCompany = (value) => {
  try {
    const parsed = new URL(value, COMPANY_PAGE_URL)
    if (normalizeHost(parsed.hostname) !== 'safran-group.com') return false
    if (parsed.pathname !== '/fr/offres') return false

    for (const [key, filterValue] of parsed.searchParams.entries()) {
      if (key.startsWith('companies') && filterValue === COMPANY_FILTER_VALUE) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

export const extractCompanyJobsUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/href="([^"]+)"/gi)) {
    const candidate = toAbsoluteUrl(match[1], COMPANY_PAGE_URL)
    if (candidate && urlTargetsExactCompany(candidate)) {
      return candidate
    }
  }

  return null
}

export const hasOfficialCompanyPageSignal = (html) => {
  const page = String(html ?? '')
  const jobsUrl = extractCompanyJobsUrl(page)

  return /<title>\s*Safran Data Systems/i.test(page)
    && normalizeWhitespace(page)?.includes(COMPANY)
    && jobsUrl != null
}

const hasExactCompanyFilterSelected = (html) => {
  const page = String(html ?? '')

  return new RegExp(
    `<option[^>]+value="${COMPANY_FILTER_VALUE}"[^>]*selected="selected"[^>]*>\\s*${COMPANY}\\s*<\\/option>`,
    'i',
  ).test(page)
}

export const hasFilteredJobsPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Offres d(?:'|&#0*39;)emploi\s*\|\s*Safran\s*<\/title>/i.test(page)
    && hasExactCompanyFilterSelected(page)
    && /c-structured-news-list__results--nb/i.test(page)
}

export const extractResultCount = (html) => {
  const match = String(html ?? '').match(/c-structured-news-list__results--nb">\s*([0-9\s.,]+)\s*</i)
  if (!match) return null

  const digits = match[1].replace(/[^\d]/g, '')
  return digits ? Number.parseInt(digits, 10) : null
}

export const extractNextPageUrl = (html) => {
  const match = String(html ?? '').match(/<a href="([^"]+)"[^>]+rel="next"/i)
  return match ? toAbsoluteUrl(match[1], FILTERED_JOBS_URL) : null
}

const extractInfoItems = (html) => [...String(html ?? '').matchAll(
  /<span class="c-offer-item__infos__item">([\s\S]*?)<\/span>/gi,
)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

export const extractJobCards = (html) => String(html ?? '')
  .split('<div class="c-offer-item js-block-link">')
  .slice(1)
  .map((segment) => {
    const titleMatch = segment.match(
      /<a href="([^"]+)" class="c-offer-item__title js-block-link--href">([\s\S]*?)<\/a>/i,
    )

    const title = stripTags(titleMatch?.[2])
    const sourceUrl = toAbsoluteUrl(titleMatch?.[1], FILTERED_JOBS_URL)
    const infoItems = extractInfoItems(segment)
    const company = infoItems[0] || null

    if (!title || !sourceUrl) {
      return null
    }

    if (company !== COMPANY) {
      throw new Error('Safran Data Systems exact company filter no longer yields only exact-company job cards')
    }

    return {
      title,
      sourceUrl,
      company,
    }
  })
  .filter(Boolean)

const asArray = (value) => Array.isArray(value) ? value : value ? [value] : []

const isJobPostingObject = (value) => {
  const type = value?.['@type']
  return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))
}

const extractJobPostingJsonLd = (html) => {
  for (const match of String(html ?? '').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const candidates = isJobPostingObject(parsed)
        ? [parsed]
        : Array.isArray(parsed)
          ? parsed
          : asArray(parsed?.['@graph'])

      const jobPosting = candidates.find((item) => isJobPostingObject(item))
      if (jobPosting) {
        return jobPosting
      }
    } catch {
      continue
    }
  }

  return null
}

const getLocationFromJobPosting = (jobPosting = {}) => {
  const location = asArray(jobPosting.jobLocation).find(Boolean) || jobPosting.jobLocation || {}
  const address = location.address || {}
  const city = normalizeWhitespace(address.addressLocality)
  const state = normalizeWhitespace(address.addressRegion)
  const country = normalizeWhitespace(address.addressCountry)

  return {
    city,
    state,
    country,
    location: [city, state, country].filter(Boolean).join(', ') || null,
  }
}

const normalizeIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

const splitQualifications = (value) => String(value ?? '')
  .replace(/\r/g, '')
  .split(/\n+|•/g)
  .map((item) => normalizeWhitespace(item))
  .filter(Boolean)

const extractExperienceRequired = (items = [], description = '') => {
  const haystack = [...items, description].join(' ')
  const match = haystack.match(/(\d+(?:\s*-\s*\d+)?\s*\+?\s*(?:years?|ans?))/i)
  return match ? normalizeWhitespace(match[1]) : null
}

const extractApplyUrl = (detailUrl, html) => {
  const simpleApply = String(html ?? '').match(/<a id="simple-apply" href="([^"]+)"/i)?.[1]
  if (simpleApply) {
    return toAbsoluteUrl(simpleApply, detailUrl)
  }

  const oneClickApply = String(html ?? '').match(/<a id="one-click-apply" href="([^"]+)"/i)?.[1]
  return oneClickApply ? toAbsoluteUrl(oneClickApply, detailUrl) : detailUrl
}

export const extractJobDetail = (card, html) => {
  const jobPosting = extractJobPostingJsonLd(html)
  if (!jobPosting) {
    throw new Error(`Safran Data Systems detail page no longer exposes a JobPosting payload for ${card.sourceUrl}`)
  }

  const company = normalizeWhitespace(jobPosting.hiringOrganization?.name)
  if (company !== COMPANY) {
    throw new Error('Safran Data Systems exact company identity could not be verified on the detail page')
  }

  const title = normalizeWhitespace(jobPosting.title || jobPosting.name || card.title)
  const requisitionId = normalizeWhitespace(jobPosting.identifier)
    || normalizeWhitespace(card.sourceUrl.match(/-(\d+)(?:\/)?$/)?.[1])
  const description = normalizeWhitespace(jobPosting.description)
  const qualifications = splitQualifications(jobPosting.qualifications)
  const experienceRequired = extractExperienceRequired(qualifications, description || '')
  const locationData = getLocationFromJobPosting(jobPosting)
  const applyUrl = extractApplyUrl(card.sourceUrl, html)

  if (!title || !requisitionId || !locationData.location) {
    throw new Error(`Safran Data Systems detail metadata is incomplete for ${card.sourceUrl}`)
  }

  return {
    title,
    company: COMPANY,
    department: normalizeWhitespace(jobPosting.industry),
    location: locationData.location,
    city: locationData.city,
    state: locationData.state,
    country: locationData.country,
    jobId: requisitionId,
    requisitionId,
    sourceUrl: card.sourceUrl,
    applyUrl,
    employmentType: normalizeWhitespace(jobPosting.employmentType),
    experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: qualifications,
    postingDate: normalizeIsoDate(jobPosting.datePosted),
    closingDate: normalizeIsoDate(jobPosting.validThrough),
    jobDescription: description,
    remoteStatus: 'On-site',
    occupationalCategory: normalizeWhitespace(jobPosting.occupationalCategory),
  }
}

export const createDefaultFetchText = ({
  fetchImpl = fetch,
  fetchBrowserText,
} = {}) => async (url) => {
  try {
    const response = await fetchImpl(url, { headers: SAFRAN_HEADERS })
    if (response.ok) {
      return response.text()
    }

    const error = new Error(`HTTP ${response.status} for ${url}`)
    if (fetchBrowserText && shouldUseBrowserFallback(error)) {
      return fetchBrowserText(url)
    }

    throw error
  } catch (error) {
    if (fetchBrowserText && shouldUseBrowserFallback(error)) {
      return fetchBrowserText(url)
    }

    throw error
  }
}

export const createSafranDataSystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText, fetchBrowserText, now: overrideNow } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      const page = await session.fetchPage(url)

      if (![200, 304].includes(page.status)) {
        throw new Error(`HTTP ${page.status} for ${url}`)
      }

      return page.html
    })

    const fetchTextImpl = fetchText || createDefaultFetchText({
      fetchBrowserText: browserTextFetcher,
    })

    try {
    const companyPageHtml = await fetchTextImpl(COMPANY_PAGE_URL)
    if (!hasOfficialCompanyPageSignal(companyPageHtml)) {
      throw new Error('Safran Data Systems official company page no longer matches the verified first-party surface')
    }

    const initialJobsUrl = extractCompanyJobsUrl(companyPageHtml)
    if (!initialJobsUrl || !urlTargetsExactCompany(initialJobsUrl)) {
      throw new Error('Safran Data Systems company page no longer links to the exact first-party jobs surface')
    }

    const cardsByUrl = new Map()
    const seenPageUrls = new Set()
    let nextPageUrl = initialJobsUrl

    while (nextPageUrl && !seenPageUrls.has(nextPageUrl)) {
      seenPageUrls.add(nextPageUrl)

      const pageHtml = await fetchTextImpl(nextPageUrl)
      if (!hasFilteredJobsPageSignal(pageHtml)) {
        throw new Error('Safran Data Systems exact company filter no longer resolves to the verified first-party jobs page')
      }

      const cards = extractJobCards(pageHtml)
      const resultCount = extractResultCount(pageHtml)
      if (resultCount && cards.length === 0) {
        throw new Error('Safran Data Systems filtered jobs page no longer exposes verified public job cards')
      }

      for (const card of cards) {
        cardsByUrl.set(card.sourceUrl, card)
      }

      nextPageUrl = extractNextPageUrl(pageHtml)
    }

    const scrapedAt = (overrideNow || now)()
    const jobs = []

    for (const card of cardsByUrl.values()) {
      const detailHtml = await fetchTextImpl(card.sourceUrl)
      const job = extractJobDetail(card, detailHtml)

      jobs.push({
        ...job,
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt,
      })
    }

    return jobs.sort((left, right) => left.title.localeCompare(right.title))
    } finally {
      if (browserSession) {
        await browserSession.close().catch(() => {})
      }
    }
  },
})

export const run = async (options = {}) => createSafranDataSystemsScraper().run(options)

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
