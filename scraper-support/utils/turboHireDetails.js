import { decodeNativeEntities, extractActiveDescription } from './activeNativeHtml.js'
import { attachInventoryEvidence } from './inventoryEvidence.js'

const clean = value => decodeNativeEntities(value).replace(/\s+/g, ' ').trim()

const requireNative = (source, condition, message) => {
  if (!condition) throw Object.assign(new Error(`[${source}] TurboHire native details: ${message}`), {
    abortRetries: true, incompleteScope: true,
  })
}

const locations = (source, record) => {
  let values
  try { values = JSON.parse(record?.Location) } catch { /* rejected below */ }
  requireNative(source, Array.isArray(values) && values.length > 0
    && values.every(value => typeof value?.Address === 'string' && value.Address.trim()),
  'native workplace addresses unavailable')
  return values.map(value => clean(value.Address).replace(/\s*,\s*/g, ', ')).sort()
}

const snapshot = (payload, { source, orgId, employer }) => {
  requireNative(source, Array.isArray(payload?.Result) && Number.isSafeInteger(payload.Total)
    && payload.Total >= 0 && payload.Total === payload.Result.length,
  'listing total is missing or truncated')
  const ids = new Set()
  const records = payload.Result.map(record => {
    requireNative(source, typeof record.JobId === 'string' && record.JobId.trim()
      && !ids.has(record.JobId), 'listing role identity is missing or duplicated')
    ids.add(record.JobId)
    requireNative(source, record.OrgDetails?.OrgID === orgId
      && clean(record.OrgDetails?.OrgName) === employer, 'listing employer does not match the declared board')
    requireNative(source, clean(record.JobTitle)
      && typeof record.JobIdObfuscated === 'string' && /^[\w%=+-]+$/.test(record.JobIdObfuscated),
    'listing title or public role identity unavailable')
    return {
      id: record.JobId, title: clean(record.JobTitle), code: clean(record.JobCode),
      publicId: record.JobIdObfuscated, locations: locations(source, record),
      posted: record.PublishedDate ?? null, closes: record.ExpiryDates?.CAREERPAGE ?? null,
    }
  }).sort((a, b) => a.id.localeCompare(b.id))
  return { records, signature: JSON.stringify(records) }
}

// JobDescV2 is a 500-character listing preview. It is not a full description,
// and frequently stops inside a tag or a quoted attribute. Read the native
// public getJobInfo response, bound to the same role, employer and workplaces.
// Never recover by accepting the preview or weakening the active HTML reader.
export const hydrateTurboHireJobs = async ({
  source, orgId, employer, origin, apiBaseUrl, boardUrl, payload, jobs,
  fetchJson, headers, listingUrl, listingRequest, maxJobs, signal, now = () => new Date().toISOString(),
}) => {
  signal?.throwIfAborted()
  const context = { source, orgId, employer }
  const opening = snapshot(payload, context)
  const selected = maxJobs ? jobs.slice(0, maxJobs) : jobs
  const hydrated = []
  const failures = []
  for (const job of selected) {
    signal?.throwIfAborted()
    const listing = payload.Result.find(record => record.JobId === job.jobId)
    requireNative(source, listing && job.sourceUrl === `${origin}/job/publicjobs/${listing.JobIdObfuscated}`
      && job.title === clean(listing.JobTitle), 'selected role is outside the current native listing')
    const url = `${apiBaseUrl}/api/publicjobs/${encodeURIComponent(job.jobId)}?fieldVisibility=CareerPage`
    const detail = await fetchJson(url, { method: 'GET', headers, signal })
    signal?.throwIfAborted()
    requireNative(source, detail?.JobId === listing.JobId && clean(detail.JobTitle) === job.title
      && detail.OrgDetails?.OrgID === orgId && clean(detail.OrgDetails?.OrgName) === employer
      && detail.JobIdObfuscated === listing.JobIdObfuscated && clean(detail.JobCode) === clean(listing.JobCode),
    'detail role, title or employer contradicts the listing')
    requireNative(source, JSON.stringify(locations(source, detail)) === JSON.stringify(locations(source, listing)),
      'detail workplaces contradict the listing')
    // The detail's generic PublishedDate can belong to another job board and
    // differ by days. The CAREERPAGE clock is the one used by filteredjobs.
    requireNative(source, (detail.PublishedDates?.CAREERPAGE ?? null) === (listing.PublishedDate ?? null)
      && (detail.ExpiryDates?.CAREERPAGE ?? null) === (listing.ExpiryDates?.CAREERPAGE ?? null),
    'detail publication or closing date contradicts the listing')
    if (detail.IsPublic !== true || detail.JobStatus !== 'Active'
      || !Array.isArray(detail.PublishedJobBoards) || !detail.PublishedJobBoards.includes('CAREERPAGE')) {
      failures.push({ stage: 'native-detail', nativeJobId: job.jobId, sourceUrl: job.sourceUrl,
        failureKind: 'native-public-vacancy-status-unqualified', nativeStatus: detail.JobStatus ?? null })
      continue
    }
    const description = extractActiveDescription(detail.JobDescriptionV2 || detail.JobDescription)
    if (!description || description.length < 150) {
      failures.push({ stage: 'native-detail', nativeJobId: job.jobId, sourceUrl: job.sourceUrl,
        failureKind: 'missing-content' })
      continue
    }
    const sections = [description, ...[detail.RolesAndResponsibilitiesV2, detail.EligibilityV2]
      .map(extractActiveDescription).filter(Boolean)]
    hydrated.push({ ...job, jobDescription: sections.join('\n\n'), sourceDescription: sections.join('\n\n'),
      sourceDetailComplete: true, sourceDescriptionApiUrl: url,
      sourceNativeGeneralPublishedDate: detail.PublishedDate ?? null,
      sourceNativeLocations: locations(source, detail) })
  }
  const closing = snapshot(await fetchJson(listingUrl, listingRequest), context)
  signal?.throwIfAborted()
  requireNative(source, opening.signature === closing.signature, 'closing native inventory changed')
  // A board with unresolved/foreign workplace labels or a caller limit is not
  // certified as a complete India inventory merely because selected roles work.
  const complete = hydrated.length === payload.Total
    && opening.records.every(record => record.locations.every(location => /(?:^|, )India$/i.test(location)))
  const verifiedAt = now()
  const result = hydrated.map(job => ({ ...job, sourceListingComplete: complete,
    lifecycleCleanupAllowed: complete, sourceInventoryScope: `declared-first-party-${source}-TurboHire-careers-board` }))
  if (failures.length && result.length) result[0].nativeCollectionEvidence = {
    source, candidateDetails: selected.length, extractedDetailJobs: result.length,
    jobs: result.map(job => ({ id: job.jobId })), exclusions: [], failures,
    listingPaginationComplete: true, closingInventoryMatches: true, sourceScopeComplete: false,
  }
  return attachInventoryEvidence(result, {
    status: complete ? (result.length ? 'complete-inventory' : 'verified-empty') : 'coverage-gap',
    surface: boardUrl, firstParty: true, listingComplete: complete, pagesFetched: 2 + hydrated.length,
    reportedTotal: payload.Total, indiaFacetCount: complete ? result.length : null, verifiedAt,
    reason: complete ? 'current-declared-TurboHire-board:stable-total-identities-workplaces-and-full-native-details'
      : 'current-declared-TurboHire-board:limited-selection-or-unresolved-India-inventory'
        + (failures.length ? ';unqualified-native-details:' + failures.map(failure => `${failure.nativeJobId}:${failure.failureKind}`).join(',') : ''),
  })
}
