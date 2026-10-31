import { activeHead, extractActiveDescription } from '../../scraper-support/utils/activeNativeHtml.js'
import { readVisibleNativeDocument } from '../../scraper-support/utils/visibleNativeHtml.js'
import { createPublishingGapAtsScraper } from '../../scraper-support/utils/publishingGapAts.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { attachSourceObservationEvidence } from '../../scraper-support/utils/sourceObservationEvidence.js'

export const CAREERS_URL = 'https://www.aplazocareers.mx/'
export const BOARD_URL = 'https://jobs.ashbyhq.com/aplazo'
export const API_URL = 'https://api.ashbyhq.com/posting-api/job-board/aplazo'
const SOURCE = 'aplazo'
const unavailable = (message, status = null) => Object.assign(new Error(`[aplazo] ${message}`), {
  softFailure: true, abortRetries: true, failureKind: [401, 403, 429].includes(status) ? 'blocked_or_access_denied' : 'source_identity_unverified',
  ...(status == null ? {} : { status, httpStatus: status }),
})
const nativeText = async (url, { signal } = {}) => {
  signal?.throwIfAborted()
  const requestSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(20000)])
  try {
    const response = await fetch(url, { signal: requestSignal, redirect: 'manual',
      headers: { Accept: url === API_URL ? 'application/json' : 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify careers check)' } })
    requestSignal.throwIfAborted()
    if (response.status !== 200 || response.url !== url) throw unavailable('Native response unavailable or redirected', response.status)
    if (Number(response.headers.get('content-length')) > 3000000) throw unavailable('Native response exceeds the source budget')
    const body = await response.text()
    requestSignal.throwIfAborted()
    if (Buffer.byteLength(body, 'utf8') > 3000000) throw unavailable('Native response exceeds the source budget')
    return body
  } catch (error) { signal?.throwIfAborted(); requestSignal.throwIfAborted(); throw error }
}
const defaultFetchPage = async (url, options) => ({ status: 200, url, html: await nativeText(url, options) })
const defaultFetchJson = async (url, options) => JSON.parse(await nativeText(url, options))
const checkHandoff = page => {
  if (page?.status !== 200 || page.url !== CAREERS_URL || typeof page.html !== 'string'
    || Buffer.byteLength(page.html, 'utf8') > 3000000) throw unavailable('Current native employer careers response is unavailable', page?.status)
  const doc = readVisibleNativeDocument(page.html, { strict: true }), head = activeHead(page.html)
  const canonical = doc.nodes(n => n.tag === 'link' && n.attrs.rel === 'canonical')
  const board = doc.nodes(n => n.tag === 'a' && n.attrs.href === BOARD_URL && doc.text(n) === 'Conoce nuestras vacantes')
  const employer = doc.nodes(n => n.tag === 'p' && /\bEn APLAZO\b/.test(doc.text(n)))
  if (head.titles.length !== 1 || head.titles[0] !== 'Inicio | Misitio' || canonical.length !== 1
    || canonical[0].attrs.href !== CAREERS_URL.slice(0, -1) || !employer.length || board.length !== 1
    || !doc.nodes(n => n.tag === 'h2' && doc.text(n) === 'Careers').length) {
    throw unavailable('Current active employer identity or exact native Ashby handoff is unqualified')
  }
}
const countryIsIndia = country => typeof country === 'string' && /^(?:IN|IND|India)$/i.test(country.trim())
const nativeIndiaScope = row => [{ location: row.location, address: row.address }, ...(row.secondaryLocations || [])]
  .some(place => countryIsIndia((place.address?.postalAddress || place.address || {}).addressCountry)
    || typeof place.location === 'string' && /\bindia\b/i.test(place.location))
const qualifiesDescription = value => {
  const doc = readVisibleNativeDocument(value || '', { strict: true })
  const root = doc.nodes(n => n.tag === 'root')[0]
  return Boolean(root && extractActiveDescription(doc.text(root)))
}

export const runNativeAplazo = async ({ fetchPage = defaultFetchPage, fetchJson = defaultFetchJson, signal } = {}) => {
  signal?.throwIfAborted()
  try {
    const page = await fetchPage(CAREERS_URL, { signal })
    signal?.throwIfAborted()
    checkHandoff(page)
    let payload
    const mapped = await createPublishingGapAtsScraper({ source: SOURCE, companyName: 'Aplazo', atsPlatform: 'ashby',
      boardToken: 'aplazo', companyCareerPage: CAREERS_URL, sourceScopeComplete: false }).run({ signal,
      fetchJson: async (url, options) => { payload = await fetchJson(url, options); signal?.throwIfAborted(); return payload },
    })
    signal?.throwIfAborted()
    const nativeById = new Map(payload.jobs.map(row => [row.id, row]))
    const jobs = mapped.filter(job => nativeIndiaScope(nativeById.get(job.jobId))).map(job => {
      const native = nativeById.get(job.jobId)
      const html = typeof native.descriptionHtml === 'string' && native.descriptionHtml.trim() ? native.descriptionHtml : null
      const plain = typeof native.descriptionPlain === 'string' && native.descriptionPlain.trim() ? native.descriptionPlain : null
      const htmlComplete = qualifiesDescription(html)
      const plainComplete = qualifiesDescription(plain)
      const description = htmlComplete ? html : plainComplete ? plain : html || plain
      const complete = htmlComplete || plainComplete
      return { ...job, sourceDescription: description, jobDescription: description,
        ...(description === plain && html ? { nativeDescriptionHTML: html } : {}),
        sourceUrl: native.jobUrl, applyUrl: native.applyUrl, link: native.applyUrl,
        sourceDetailComplete: complete, ...(!complete ? { sourceDetailFailureKind: 'missing-content' } : {}),
        sourceListingComplete: false, sourceScopeComplete: false, lifecycleCleanupAllowed: false }
    })
    attachInventoryEvidence(jobs, { status: 'coverage-gap', surface: API_URL, firstParty: true,
      listingComplete: false, pagesFetched: 2, reportedTotal: null, indiaFacetCount: null, verifiedAt: null,
      reason: 'Current native employer handoff and single posting response observed; whole-company scope and independent closing inventory are unproved' })
    return attachSourceObservationEvidence(jobs, { source: SOURCE, recordKind: payload.jobs.every(row => row.isListed) ? 'vacancy-rows' : 'mixed',
      observedRecordCount: payload.jobs.length, observedVacancyCount: payload.jobs.filter(row => row.isListed).length,
      sourceScopeComplete: false })
  } catch (error) { signal?.throwIfAborted(); throw error }
}
