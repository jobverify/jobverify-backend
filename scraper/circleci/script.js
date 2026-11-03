import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { composeAbortSignals, fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { createPublishingGapAtsScraper, validatePublicPostingScope } from '../../scraper-support/utils/publishingGapAts.js'
import { attachInventoryEvidence, readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { attachSourceObservationEvidence } from '../../scraper-support/utils/sourceObservationEvidence.js'
import { greenhouseCountryLabels, greenhouseLocationLabels } from '../../scraper-support/utils/greenhouseLocations.js'
import { CAREERS_URL, NATIVE_API_URL, check, digest, norm, readCorporateRoles, reviewApplicationDetail, reviewDescription, roleUrl, validateNativeRecords, verifyNativeRoleBinding } from './native.js'
import CIRCLECI_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = CIRCLECI_CATALOG.source
export const COMPANY = CIRCLECI_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = CIRCLECI_CATALOG.officialBrandName
export const VERIFIED_ON = CIRCLECI_CATALOG.verifiedOn
export const PROVIDER_METADATA = CIRCLECI_CATALOG
export const CAREERS_PAGE_URL = CIRCLECI_CATALOG.companyCareerPage

const ROLE_LOCATION_PATTERN =
  /\s+(Remote(?:,\s*[^<]+)?|London(?:,\s*[^<]+)?|Mexico City(?:,\s*[^<]+)?|San Francisco(?:,\s*[^<]+)?|Toronto(?:,\s*[^<]+)?|[A-Za-z .'-]+,\s*India|Ontario,\s*Canada|Ontario|UK|Canada|United States)\s*$/i

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_PAGE_URL).toString()
  } catch {
    return null
  }
}

const splitRoleLabel = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return { title: null, location: null }

  const match = normalized.match(ROLE_LOCATION_PATTERN)
  if (!match) {
    return { title: normalized, location: null }
  }

  return {
    title: normalized.slice(0, match.index).trim() || null,
    location: match[1].trim(),
  }
}

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title>\s*career opportunities\s*-\s*circleci\s*<\/title>/i.test(page)
    && normalized.includes('posting expired')
    && normalized.includes('current open roles')
    && /href=["'][^"']*\/careers\/jobs\/[^"']+["']/i.test(page)
}

export const extractRoleSummaries = (html = '') => {
  const roles = []
  const page = String(html ?? '')

  for (const sectionMatch of page.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)) {
    const sectionHtml = sectionMatch[1]
    const department = normalizeWhitespace(
      sectionHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || null,
    )

    if (!department) continue

    for (const linkMatch of sectionHtml.matchAll(/<a[^>]*href=["']([^"']*\/careers\/jobs\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const url = toAbsoluteUrl(linkMatch[1])
      const { title, location } = splitRoleLabel(linkMatch[2])

      if (!url || !title || !location) continue

      roles.push({
        title,
        location,
        department,
        url,
      })
    }
  }

  return roles
}

const hasIndiaRole = (roles = []) =>
  roles.some((role) => /\bindia\b/i.test(String(role.location ?? '')))

const allRolesStayOnFirstPartyDomain = (roles = []) =>
  roles.every((role) => {
    try {
      return new URL(role.url).hostname === 'circleci.com'
    } catch {
      return false
    }
  })

export const createCircleCiScraper = ({ fetchImpl = globalThis.fetch } = {}) => ({
  async run({
    signal, maxJobs = null, totalBudgetMs = 90000, requestTimeoutMs = 20000,
  } = {}) {
    signal?.throwIfAborted()
    check(Number.isFinite(totalBudgetMs) && totalBudgetMs > 0 && Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0, 'request budget must be finite and positive')
    const bounded = composeAbortSignals(signal, AbortSignal.timeout(totalBudgetMs)), deadline = Date.now() + totalBudgetMs
    const receipts = []
    const request = async (url, json = false) => {
      signal?.throwIfAborted(); bounded.throwIfAborted()
      const result = await (json ? fetchJsonWithRetry : fetchTextWithRetry)(url, { fetchImpl, signal: bounded, timeoutMs: Math.max(1, Math.min(requestTimeoutMs, deadline - Date.now())), attempts: 1,
        includeResponseMetadata: true, headers: { 'User-Agent': USER_AGENT, Accept: json ? 'application/json' : 'text/html,application/xhtml+xml' }, label: SOURCE })
      signal?.throwIfAborted(); bounded.throwIfAborted()
      check(result.status === 200 && result.url === url, 'public response redirected away from the exact employer identity')
      const body = json ? result.payload : result.html
      receipts.push({ url, status: result.status, observedAt: new Date().toISOString(), parsedBodySHA256: digest(body) })
      return body
    }
    const corporate = readCorporateRoles(await request(CAREERS_URL))
    const payload = await request(NATIVE_API_URL, true), records = validateNativeRecords(payload)
    const byId = new Map(records.map(record => [String(record.id), record]))
    for (const row of corporate) check(byId.has(row.id) && norm(byId.get(row.id).title) === row.title
      && norm(byId.get(row.id).location?.name) === row.location, 'corporate/native role identity or location disagrees')
    const seed = corporate[0]
    verifyNativeRoleBinding(await request(seed.url), seed, byId.get(seed.id))
    const provider = { source: SOURCE, companyName: COMPANY, atsPlatform: 'greenhouse', boardToken: 'circleci', companyCareerPage: CAREERS_URL, sourceScopeComplete: false }
    const inner = await createPublishingGapAtsScraper(provider).run({ signal: bounded, fetchJson: async url => { check(url === NATIVE_API_URL, 'unexpected native endpoint'); return payload } })
    const evidence = readInventoryEvidence(inner)
    const ownIndia = record => greenhouseLocationLabels(record).some(label => /\bindia\b/i.test(label)) || greenhouseCountryLabels(record).some(label => /^(?:india|in|ind)$/i.test(label))
    const selected = inner.filter(job => ownIndia(byId.get(String(job.jobId))))
    const details = new Map()
    const detail = async record => {
      let payload
      try { payload = await request(`https://boards-api.greenhouse.io/v1/boards/circleci/jobs/${record.id}?questions=true`, true) }
      catch (error) {
        signal?.throwIfAborted(); bounded.throwIfAborted()
        if (error?.failureKind === 'parser_or_contract_error') throw error
        return { complete: false, failureKind: 'upstream-application-criteria-unavailable' }
      }
      return reviewApplicationDetail(payload, record)
    }
    for (const job of selected) details.set(String(job.jobId), await detail(byId.get(String(job.jobId))))
    const closingPayload = await request(NATIVE_API_URL, true)
    validateNativeRecords(closingPayload)
    check(digest(payload) === digest(closingPayload), 'closing native inventory, dates, geography or full criteria changed')
    check(digest(corporate) === digest(readCorporateRoles(await request(CAREERS_URL))), 'closing corporate role inventory changed')
    verifyNativeRoleBinding(await request(seed.url), seed, byId.get(seed.id))
    for (const job of selected) {
      const first = details.get(String(job.jobId)), closing = await detail(byId.get(String(job.jobId)))
      if (first.snapshot && closing.snapshot) check(first.snapshot === closing.snapshot, 'closing native application questions or criteria changed')
      else details.set(String(job.jobId), { ...first, complete: false, failureKind: 'upstream-application-criteria-unavailable' })
    }
    const unresolved = records.filter(record => validatePublicPostingScope([record], 'greenhouse', provider).length > 0).map(record => String(record.id))
    const disagreement = corporate.length !== records.length
    const observations = { corporateRoleCount: corporate.length, nativeRoleCount: records.length, corporateNativeCountAgreement: !disagreement,
      missingCorporateRoleIds: records.filter(record => !corporate.some(row => row.id === String(record.id))).map(record => String(record.id)),
      unresolvedCountryRoleIds: unresolved, closingInventoryAndCriteriaMatch: true, corporateRoles: corporate,
      nativeRecords: records, selectedIndiaApplicationDetailsComplete: [...details.values()].every(value => value.complete), receipts, sourceScopeComplete: false }
    const capped = Number.isSafeInteger(maxJobs) && maxJobs > 0 ? selected.slice(0, maxJobs) : selected
    const jobs = capped.map(job => {
      const native = byId.get(String(job.jobId)), application = details.get(String(job.jobId))
      const description = application?.description || reviewDescription(job.sourceDescription)
      const postingDate = native.first_published == null ? null : new Date(native.first_published).toISOString()
      return { ...job, jobId: String(native.id), source: SOURCE, company: COMPANY, country: 'India', applyUrl: roleUrl(native), sourceUrl: roleUrl(native), link: roleUrl(native),
        postingDate, sourcePostingDate: postingDate, sourceDateEvidence: postingDate ? 'greenhouse-native-first-published' : null,
        sourceNativeDates: { first_published: native.first_published ?? null, updated_at: native.updated_at ?? null, application_deadline: application?.applicationDeadline ?? null },
        closingDate: application?.applicationDeadline || job.closingDate || null,
        ...(application?.applicationDeadline ? { sourceClosingDateIsExact: /T/.test(application.applicationDeadline) } : {}),
        jobDescription: description, sourceDescription: description, sourceDetailComplete: !!description && application?.complete === true,
        ...(!application?.complete ? { sourceDetailFailureKind: application?.failureKind || 'unreviewed-or-missing-native-application-criteria' } : {}),
        sourceNativeDetailPayload: application?.payload || null, sourceNativeApplicationQuestions: application?.payload?.questions ?? null,
        sourceApplicationQuestions: application?.questions ?? null, sourceNativeLocationQuestions: application?.payload?.location_questions ?? null,
        sourceNativeInventory: observations, sourceNativeListingRecord: native, sourceListingComplete: false, sourceScopeComplete: false, lifecycleCleanupAllowed: false }
    })
    signal?.throwIfAborted(); bounded.throwIfAborted()
    attachSourceObservationEvidence(jobs, { source: SOURCE, recordKind: 'vacancy-rows', observedRecordCount: records.length, observedVacancyCount: records.length, sourceScopeComplete: false })
    return attachInventoryEvidence(jobs, { ...evidence, status: 'discovery-only', listingComplete: false,
      pagesFetched: 2, reportedTotal: records.length, indiaFacetCount: null, verifiedAt: new Date().toISOString(),
      reason: `${evidence.reason};current-corporate-role-embed-bound;closing-full-native-inventory-match${disagreement ? ';corporate-native-count-disagreement' : ''};whole-source-scope-unproved` })
  },
})

export const run = async (options = {}) => createCircleCiScraper(options).run(options)

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
