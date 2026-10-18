import { verifyPublishedZwayamEmployer } from './publishedEmployer.js'
import { createDarwinboxScraper } from '../darwinbox/script.js'
import { createHappiestZwayamScraper, LISTING_API_URL, DETAIL_API_URL, COMPANY_CONFIG_URL, buildJobDetailUrl as buildZwayamJobDetailUrl } from './zwayam.js'
export { LISTING_API_URL, DETAIL_API_URL, COMPANY_CONFIG_URL, transformHappiestZwayamJob } from './zwayam.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { composeAbortSignals } from '../../scraper-support/utils/fetch.js'

export const OFFICIAL_CAREERS_URL = 'https://careers.happiestminds.com/'
export const DARWINBOX_ORIGIN = 'https://smileshrms.darwinbox.com'
export const PUBLIC_LISTING_API_URL = DARWINBOX_ORIGIN + '/ms/candidateapi/job/alljobs'
export const ZWAYAM_BOARD_URL = 'https://jobs.happiestminds.com/happiestminds/'

const fetchPublishedDarwinbox = (url, options) => {
  const isListing = url === PUBLIC_LISTING_API_URL + '?companyId=main'
  return fetch(isListing ? PUBLIC_LISTING_API_URL : url, isListing ? {
    ...options,
    headers: { ...options?.headers, 'Accept-Language': 'en' },
  } : options)
}

const defaultFetchPage = async (url, { signal } = {}) => {
  signal?.throwIfAborted()
  const response = await fetch(url, {
    signal: composeAbortSignals(signal, AbortSignal.timeout(30000)),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify scraper)', Accept: 'text/html' },
  })
  return { status: response.status, url: response.url, html: await response.text() }
}

const hasCurrentEmployerHandoffs = ({ status, url, html = '' }) => status === 200
  && url === OFFICIAL_CAREERS_URL
  && /<title[^>]*>\s*Home - Careers\s*<\/title>/i.test(html)
  && /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']https:\/\/careers\.happiestminds\.com\/["'])[^>]*>/i.test(html)
  && /Happiest Minds Technologies Limited/i.test(html)
  && /<a\b[^>]*\bhref=["']https:\/\/www\.happiestminds\.com\/["']/i.test(html)
  && /<a\b[^>]*\bhref=["']https:\/\/jobs\.happiestminds\.com\/happiestminds\/["']/i.test(html)
  && /<a\b[^>]*\bhref=["']https:\/\/smileshrms\.darwinbox\.com\/ms\/candidate\/careers["']/i.test(html)

const nativeDate = (value) => {
  if (value == null || value === '') return null
  const milliseconds = typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value))
    ? Number(value) * (Number(value) < 1e12 ? 1000 : 1)
    : Date.parse(String(value))
  if (!Number.isFinite(milliseconds)) throw new Error('Published careers lifecycle date is invalid')
  return new Date(milliseconds).toISOString()
}

const activeNativeDates = (row, nowMs) => {
  const careers = row.job_posting?.careers
  if (careers !== undefined && (!careers || careers.source !== 'careers' || careers.from == null)) return null
  const postingDate = nativeDate(careers?.from ?? row.posted_on)
  const closingDate = nativeDate(careers?.to)
  if ((postingDate && Date.parse(postingDate) > nowMs)
    || (closingDate && Date.parse(closingDate) <= nowMs)) return null
  return { postingDate, closingDate }
}

const descriptionText = (value) => String(value || '')
  .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()

export const createHappiestMindsScraper = ({ now = () => new Date().toISOString(), publicBoard = 'zwayam', ...limits } = {}) => {
  if (!['zwayam', 'darwinbox'].includes(publicBoard)) throw new Error('Unknown Happiest Minds public board')
  const zwayam = createHappiestZwayamScraper(limits)
  const engine = createDarwinboxScraper({
    companyName: 'Happiest Minds', source: 'happiestminds', origin: DARWINBOX_ORIGIN,
    fetchImpl: fetchPublishedDarwinbox,
  })
  return {
    ...engine,
    buildCareersPageUrl: () => publicBoard === 'darwinbox' ? engine.buildCareersPageUrl() : ZWAYAM_BOARD_URL,
    buildListingApiUrl: () => publicBoard === 'darwinbox' ? PUBLIC_LISTING_API_URL : LISTING_API_URL,
    buildJobDetailUrl: (...args) => publicBoard === 'darwinbox' ? engine.buildJobDetailUrl(...args) : buildZwayamJobDetailUrl(...args),
    async run({ fetchPage = defaultFetchPage, fetchListingPage, signal, ...options } = {}) {
      signal?.throwIfAborted()
      const careers = await fetchPage(OFFICIAL_CAREERS_URL, { signal })
      signal?.throwIfAborted()
      if (!hasCurrentEmployerHandoffs(careers)) throw new Error('Happiest Minds current employer identity or published ATS handoff changed')
      if (publicBoard === 'zwayam' && !fetchListingPage) return zwayam.run({ ...options, signal, now, verifyPublishedEmployer: () => verifyPublishedZwayamEmployer({ fetchPage, signal }) })
      const fetchLegacyListing = fetchListingPage || engine.fetchListingPageFromApi
      const verifiedAt = now()
      const rawIds = new Set()
      const verifiedIndiaDates = new Map()
      let pagesFetched = 1
      let darwinboxReportedTotal = null
      const jobs = await engine.run({ ...options, signal, fetchListingPage: async request => {
        const payload = await fetchLegacyListing(request)
        pagesFetched++
        darwinboxReportedTotal = payload?.job_counts == null ? null : Number(payload.job_counts)
        for (const row of Array.isArray(payload?.data) ? payload.data : []) {
          const id = String(row?.id || '').trim()
          if (rawIds.has(id)) throw new Error('Happiest Minds published listing has a duplicate raw ID')
          rawIds.add(id)
          if (String(row.country || '').trim().toLowerCase() !== 'india'
            || !/\bIndia\s*$/i.test(String(row.locations || '').trim())) continue
          const dates = activeNativeDates(row, Date.parse(verifiedAt))
          if (!dates || descriptionText(row.jd).length < 100) continue
          verifiedIndiaDates.set(id, dates)
        }
        return payload
      } })
      return attachInventoryEvidence(jobs.filter(job => verifiedIndiaDates.has(String(job.jobId))).map(job => ({
        ...job, country: 'India', ...verifiedIndiaDates.get(String(job.jobId)), sourceListingComplete: false,
      })), {
        status: 'coverage-gap', surface: OFFICIAL_CAREERS_URL, firstParty: true,
        listingComplete: false, pagesFetched, reportedTotal: null, indiaFacetCount: null, verifiedAt,
        reason: 'Covered only the currently published Darwinbox board (' + darwinboxReportedTotal + ' reported roles). The separately published Zwayam board and per-role application coverage remain unverified; these India roles cannot authorize complete source reconciliation.',
      })
    },
  }
}

const scraper = createHappiestMindsScraper()
export const { buildCareersPageUrl, buildListingApiUrl, buildJobDetailUrl, extractSearchResults } = scraper
export const run = (options = {}) => createHappiestMindsScraper(options).run(options)
