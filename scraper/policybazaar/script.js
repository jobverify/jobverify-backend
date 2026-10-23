import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { POLICYBAZAAR_CATALOG } from './catalog.js'
import { document, norm } from '../../scraper-support/shared/rmkNativePairHtml.js'
import { activeHead } from '../../scraper-support/utils/activeNativeHtml.js'
import { normalizeInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const PROVIDER_METADATA = POLICYBAZAAR_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const PUBLIC_BOARD_URL = PROVIDER_METADATA.publicBoardUrl

// The shared reader handles hidden/inert/template/display/visibility. Close its
// content-visibility gap locally without changing other providers' contracts.
const activeDocument = html => {
  const doc = document(html)
  const mark = (node, inherited = false) => {
    if (typeof node === 'string') return
    node.inactive ||= inherited || /(?:^|;)\s*content-visibility\s*:\s*hidden\s*(?:!important\s*)?(?:;|$)/i.test((node.attrs.style || '').replace(/\/\*[\s\S]*?\*\//g, ''))
    node.children.forEach(child => mark(child, node.inactive))
  }
  mark(doc.root)
  return doc
}
const byClass = (doc, node, tag, cls) => doc.nodes(n => n.tag === tag && doc.hasClass(n, cls), node)
const slug = value => norm(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const hasOfficialCareersPageSignal = html => {
  const doc = activeDocument(html)
  return /Policybazaar/i.test(activeHead(html).titles.join(' '))
    && doc.nodes(n => doc.hasClass(n, 'ijp') && n.tag === 'ul').length === 1
    && /Find the job that's right for you/i.test(doc.text(doc.root))
}
export const hasSharedApplicationFormSignal = html => /<form\b[^>]*\bid=["']careerFormReferer["']/i.test(html)
  && /<select\b[^>]*\bid=["']refPosition["']/i.test(html)
  && /<input\b[^>]*\btype=["']file["']/i.test(html)

export const extractHiringCities = html => {
  const doc = activeDocument(html)
  return [...new Set(doc.nodes(n => doc.hasClass(n, 'city-location')).map(doc.text).filter(Boolean))]
}

export const extractSearchResults = html => {
  const doc = activeDocument(html)
  const board = doc.nodes(n => n.tag === 'ul' && doc.hasClass(n, 'ijp'))
  if (board.length !== 1) return []
  const jobs = [], seen = new Set()
  for (const card of board[0].children.filter(n => typeof n !== 'string' && n.tag === 'li' && !n.inactive)) {
    const headings = byClass(doc, card, 'p', 'heading')
    if (headings.length !== 1) continue
    const title = doc.text(headings[0])
    if (!title || /don't see a job opening/i.test(title)) continue
    const jobId = slug(title)
    if (!jobId || seen.has(jobId)) throw Error('Ambiguous native role card identity')
    seen.add(jobId)
    let role = null, eligibility = null
    for (const p of byClass(doc, card, 'p', 'text')) {
      const labels = doc.nodes(n => n.tag === 'strong', p)
      const label = labels.map(doc.text).join(' ')
      // Strong/headings-only content is not active description prose.
      const prose = norm(p.children.map(child => typeof child === 'string' ? child : ['strong', 'b', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(child.tag) ? '' : doc.text(child)).join(' '))
      if (/^Role\s*:/i.test(label)) role = prose.length >= 20 && prose !== title ? prose : null
      if (/^Eligibility\s*:/i.test(label)) eligibility = prose || null
    }
    jobs.push({ title, company: COMPANY, department: null, location: null, city: null, country: null,
      jobId, requisitionId: null, sourceUrl: CAREERS_URL, applyUrl: CAREERS_URL,
      employmentType: null, experienceRequired: null, minimumQualification: eligibility,
      preferredQualification: null, requiredSkills: [], postingDate: null, closingDate: null,
      jobDescription: role, remoteStatus: null, sourceDetailComplete: false,
      sourceDetailStatus: role ? 'missing-role-location-and-vacancy-evidence' : 'missing-description',
      sourceListingComplete: false, sourceScopeComplete: false, lifecycleCleanupAllowed: false,
      nativeCardHTML: doc.outer(card), firstEverPublication: null })
  }
  return jobs
}

export const createPolicybazaarScraper = (defaults = {}) => ({
  async run(runtime = {}) {
    const { fetchImpl = globalThis.fetch, fetchText, timeoutMs = 20000, signal } = { ...defaults, ...runtime }
    let pagesFetched = 0, nativeRoleCards = [], retainedResponse = null
    const gap = (reason, cause) => Object.assign(new Error(`Policybazaar coverage gap: ${reason}`, { cause }), {
      code: 'POLICYBAZAAR_COVERAGE_GAP', sourceListingComplete: false, nativeRoleCards, retainedResponse,
      inventoryEvidence: normalizeInventoryEvidence({ status: 'coverage-gap', surface: CAREERS_URL,
        firstParty: pagesFetched > 0, listingComplete: false, pagesFetched,
        reportedTotal: null, indiaFacetCount: null, verifiedAt: new Date().toISOString(), reason }),
    })
    if (signal?.aborted) throw signal.reason
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300000) throw gap('Invalid aggregate deadline')
    const controller = new AbortController()
    let timer, onAbort
    const cancellation = new Promise((_, reject) => {
      timer = setTimeout(() => { const error = gap('Aggregate deadline exceeded fetching native page or reading response body'); controller.abort(error); reject(error) }, timeoutMs)
      onAbort = () => { controller.abort(signal.reason); reject(signal.reason) }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
    const check = () => { if (controller.signal.aborted) throw controller.signal.reason }
    try {
      return await Promise.race([cancellation, (async () => {
        check()
        const capturedAt = new Date().toISOString()
        const response = fetchText ? { status: 200, url: CAREERS_URL, text: () => fetchText(CAREERS_URL, { signal: controller.signal }) }
          : await fetchImpl(CAREERS_URL, { signal: controller.signal, redirect: 'manual', headers: { accept: 'text/html' } })
        check()
        if (response?.status !== 200) throw gap(`Official careers HTTP ${response?.status ?? 'unknown'}`)
        if (response.url !== CAREERS_URL) throw gap('Unreviewed careers redirect or employer identity')
        const body = await response.text()
        check()
        if (typeof body !== 'string' || !body.trim()) throw gap('Native careers body unavailable')
        pagesFetched++
        retainedResponse = { url: CAREERS_URL, finalUrl: response.url, status: response.status, capturedAt, body }
        if (!hasOfficialCareersPageSignal(body)) throw gap('Native careers employer/listing shape changed')
        nativeRoleCards = extractSearchResults(body)
        if (!hasSharedApplicationFormSignal(body)) throw gap('Native position-select application form unavailable')
        if (!nativeRoleCards.length) throw gap('No current role-card inventory; no explicit native zero-opening signal')
        // Current cards are broad hiring categories. The shared office section
        // and resume pool do not bind a country/location to an individual role,
        // establish a requisition, or prove a finite current vacancy inventory.
        throw gap('Observed native role cards lack role-specific location/country and finite current vacancy inventory evidence')
      })()])
    } catch (error) {
      controller.abort(error)
      if (signal?.aborted) throw signal.reason
      if (error?.code === 'POLICYBAZAAR_COVERAGE_GAP') throw error
      throw gap('Native careers transport, body, or parsing unavailable', error)
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort) }
  },
})
export const run = async (options = {}) => createPolicybazaarScraper(options).run(options)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const jobs = await run()
  if (process.argv.includes('--dry-run')) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(path.join(currentDir, 'jobs.json'), JSON.stringify(jobs, null, 2))
  } else {
    const { saveToDB } = await import('../../scraper-support/utils/saveToDB.js')
    await saveToDB(jobs, SOURCE)
  }
}
