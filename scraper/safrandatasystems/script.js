import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'safrandatasystems'
export const COMPANY = 'Safran Data Systems'
export const OFFICIAL_BRAND_NAME = 'Safran Data Systems SAS'
export const VERIFIED_ON = '2026-08-14'
export const COMPANY_PAGE_URL = 'https://www.safran-group.com/fr/societes/safran-data-systems'
export const CAREERS_HOST = 'https://careers.safran-group.com'
export const SEARCH_KEYWORDS = 'Safran Data Systems'
export const SEARCH_URL = `${CAREERS_HOST}/offre-de-emploi/liste-toutes-offres.aspx?Keywords=Safran%20Data%20Systems`
export const SEARCH_RSS_URL = `${CAREERS_HOST}/handlers/offerRss.ashx?LCID=1036&Keywords=Safran%20Data%20Systems`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const SAFRAN_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/[\u2012-\u2015]/g, '-')
  .replace(/\u00a0/g, ' ')

const stripTags = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n')
  .replace(/<p\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(stripTags(value))
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeSearchText = (value) => normalizeWhitespace(value)
  ?.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  || ''

const normalizeFrenchDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

const toAbsoluteUrl = (value, baseUrl = SEARCH_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const extractMetaDescription = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<meta[^>]+name="Description"[^>]+content="([^"]+)"/i)?.[1])

const extractTitleText = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const extractFieldById = (html, fieldId) =>
  normalizeWhitespace(String(html ?? '').match(new RegExp(`<p id="${fieldId}">([\\s\\S]*?)<\\/p>`, 'i'))?.[1])

const extractFieldListById = (html, fieldId) => [...String(html ?? '').matchAll(
  new RegExp(`<p id="${fieldId}">([\\s\\S]*?)<\\/p>`, 'gi'),
)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const extractOfferIdFromUrl = (value) =>
  normalizeWhitespace(String(value ?? '').match(/_(\d+)\.aspx(?:\?|$)/i)?.[1])

const extractDepartmentFromAnchorTitle = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalizeWhitespace(normalized?.match(/\)\s*-\s*(.+)$/)?.[1]) || null
}

const extractLocationParts = (value) => {
  const parts = normalizeWhitespace(value)?.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean) || []
  return {
    geographicalArea: parts[0] || null,
    country: parts[1] || null,
    state: parts[2] || null,
    departmentArea: parts[3] || null,
  }
}

const extractCityFromAddress = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const postalMatch = normalized.match(/\b\d{5}\s+(.+)$/)
  return normalizeWhitespace(postalMatch?.[1]) || null
}

export const buildSearchUrl = (page = 1) => {
  const url = new URL(SEARCH_URL)
  const normalizedPage = Math.max(1, Number(page) || 1)

  if (normalizedPage > 1) {
    url.searchParams.set('page', String(normalizedPage))
  } else {
    url.searchParams.delete('page')
  }

  return url.toString()
}

export const createDefaultFetchText = ({
  fetchImpl = fetch,
} = {}) => async (url) => {
  const response = await fetchImpl(url, {
    headers: SAFRAN_HEADERS,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasVerifiedSearchPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalizedTitle = normalizeSearchText(extractTitleText(rawHtml))
  const text = normalizeSearchText(rawHtml)

  return normalizedTitle.startsWith(normalizeSearchText('Safran - Résultat de votre recherche'))
    && normalizedTitle.includes(normalizeSearchText(`Mots clés : ${SEARCH_KEYWORDS}`))
    && /offerRss\.ashx\?lcid=1036&amp;Keywords=Safran%20Data%20Systems/i.test(rawHtml)
    && /ts-offer-list-item offerlist-item/i.test(rawHtml)
    && text.includes(normalizeSearchText(SEARCH_KEYWORDS))
}

export const extractTotalPages = (html = '') => {
  const pageNumbers = [...String(html ?? '').matchAll(/liste-toutes-offres\.aspx\?[^"]*page=(\d+)/gi)]
    .map((match) => Number.parseInt(match[1], 10))
    .filter(Number.isFinite)

  if (!pageNumbers.length) {
    return extractJobCards(html).length ? 1 : 0
  }

  return Math.max(...pageNumbers)
}

export const extractJobCards = (html = '') => [...String(html ?? '').matchAll(
  /<li class="ts-offer-list-item offerlist-item [\s\S]*?<ul class="ts-offer-list-item__description [\s\S]*?<\/ul>/gi,
)]
  .map((match) => {
    const block = match[0]
    const titleAnchor = block.match(
      /<a[^>]*class="[^"]*\bts-offer-list-item__title-link\b[^"]*"[^>]*>[\s\S]*?<\/a>/i,
    )?.[0] || ''

    const sourceUrl = toAbsoluteUrl(titleAnchor.match(/href="([^"]+)"/i)?.[1], SEARCH_URL)
    const title = normalizeWhitespace(titleAnchor.match(/>([\s\S]*?)<\/a>/i)?.[1])
    const anchorTitle = normalizeWhitespace(titleAnchor.match(/title="([^"]+)"/i)?.[1])
    const detailsHtml = block.match(/<ul class="ts-offer-list-item__description [\s\S]*?<\/ul>/i)?.[0] || ''
    const details = [...detailsHtml.matchAll(/<li(?: [^>]*)?>([\s\S]*?)<\/li>/gi)]
      .map((item) => normalizeWhitespace(item[1]))
      .filter(Boolean)
    const requisitionId = normalizeWhitespace(details[0]?.replace(/^Réf\.\s*:\s*/i, ''))
    const offerId = extractOfferIdFromUrl(sourceUrl) || normalizeWhitespace(requisitionId?.match(/(\d+)$/)?.[1])

    if (!sourceUrl || !title || !requisitionId || !offerId) {
      return null
    }

    return {
      title,
      company: COMPANY,
      department: extractDepartmentFromAnchorTitle(anchorTitle),
      location: normalizeWhitespace(details[3]),
      city: extractCityFromAddress(details[3]),
      state: null,
      country: 'France',
      jobId: offerId,
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeWhitespace(details[2]),
      postingDate: normalizeFrenchDate(details[1]),
      jobDescription: null,
    }
  })
  .filter(Boolean)

export const hasVerifiedDetailSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalizedTitle = normalizeSearchText(extractTitleText(rawHtml))
  const metaDescription = extractMetaDescription(rawHtml)
  const text = normalizeSearchText(rawHtml)

  return normalizedTitle.startsWith(normalizeSearchText('Safran -'))
    && metaDescription?.includes(`Offre d'emploi ${OFFICIAL_BRAND_NAME} -`)
    && /value="Je postule à cette offre"/i.test(rawHtml)
    && text.includes(normalizeSearchText('Description du poste'))
    && text.includes(normalizeSearchText('Localisation du poste'))
}

export const extractJobDetail = (html, card = {}) => {
  const rawHtml = String(html ?? '')
  const title = extractFieldById(rawHtml, 'fldjobdescription_jobtitle') || card.title || null
  const contract = extractFieldById(rawHtml, 'fldjobdescription_contract') || card.employmentType || null
  const descriptionBlocks = [
    ...extractFieldListById(rawHtml, 'fldjobdescription_description1'),
    ...extractFieldListById(rawHtml, 'fldjobdescription_longtext2'),
    ...extractFieldListById(rawHtml, 'fldjobdescription_description2'),
  ]
  const geographicalLocation = extractFieldById(rawHtml, 'fldlocation_location_geographicalareacollection')
  const jobLocation = extractFieldById(rawHtml, 'fldlocation_joblocation')
  const locationParts = extractLocationParts(geographicalLocation)
  const city = extractCityFromAddress(jobLocation) || card.city || null
  const location = normalizeWhitespace(
    jobLocation
      ? `${jobLocation}, France`
      : geographicalLocation || card.location || 'France',
  )

  return {
    title,
    company: COMPANY,
    department: card.department || null,
    location,
    city,
    state: locationParts.state || locationParts.departmentArea || null,
    country: 'France',
    jobId: card.jobId || null,
    requisitionId: card.requisitionId || null,
    sourceUrl: card.sourceUrl || null,
    applyUrl: card.applyUrl || card.sourceUrl || null,
    employmentType: contract,
    experienceRequired: extractFieldById(rawHtml, 'fldapplicantcriteria_experiencelevel'),
    minimumQualification: extractFieldById(rawHtml, 'fldapplicantcriteria_educationlevel'),
    preferredQualification: null,
    requiredSkills: [],
    postingDate: card.postingDate || null,
    closingDate: null,
    jobDescription: normalizeWhitespace(descriptionBlocks.join('\n\n')),
  }
}

export const createSafranDataSystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText } = {}) {
    const fetchTextImpl = fetchText || createDefaultFetchText()
    const firstPageHtml = await fetchTextImpl(buildSearchUrl(1))

    if (!hasVerifiedSearchPageSignal(firstPageHtml)) {
      throw new Error('Safran Data Systems verified keyword search page no longer matches the accessible first-party careers surface')
    }

    const totalPages = extractTotalPages(firstPageHtml)
    const jobs = []
    const seenJobIds = new Set()

    for (let page = 1; page <= Math.max(1, totalPages); page += 1) {
      const pageHtml = page === 1 ? firstPageHtml : await fetchTextImpl(buildSearchUrl(page))

      if (!hasVerifiedSearchPageSignal(pageHtml)) {
        throw new Error(`Safran Data Systems verified keyword search page no longer matches the accessible first-party careers surface on page ${page}`)
      }

      const cards = extractJobCards(pageHtml)
      if (cards.length === 0) {
        throw new Error('Safran Data Systems accessible keyword search no longer exposes exact-company job cards')
      }

      for (const card of cards) {
        if (seenJobIds.has(card.jobId)) continue
        seenJobIds.add(card.jobId)

        const detailHtml = await fetchTextImpl(card.sourceUrl)
        if (!hasVerifiedDetailSignal(detailHtml)) {
          throw new Error(`Safran Data Systems detail page no longer matches the accessible first-party careers surface for ${card.sourceUrl}`)
        }

        const job = extractJobDetail(detailHtml, card)
        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })
      }
    }

    if (jobs.length === 0) {
      throw new Error('Safran Data Systems accessible keyword search no longer exposes exact-company public jobs')
    }

    return jobs.sort((left, right) => (left.postingDate || '').localeCompare(right.postingDate || '') * -1)
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
