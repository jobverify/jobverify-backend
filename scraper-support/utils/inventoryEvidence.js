export const INVENTORY_EVIDENCE = Symbol.for('jobverify.inventory-evidence')

const INVENTORY_STATUSES = new Set([
  'verified-empty',
  'complete-inventory',
  'discovery-only',
  'coverage-gap',
  'unverified',
])

const toHttpUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

const toNonNegativeInteger = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : fallback
}

const toOptionalNonNegativeInteger = (value) => {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : null
}

const toIsoTimestamp = (value) => {
  if (value == null || value === '') return null
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString()
}

const invalidEvidence = () => ({
  status: 'unverified',
  surface: null,
  firstParty: false,
  listingComplete: false,
  pagesFetched: 0,
  reportedTotal: null,
  indiaFacetCount: null,
  verifiedAt: null,
  reason: 'invalid-inventory-evidence',
})

export const isVerifiedEmptyEvidence = (evidence = {}) => (
  evidence?.status === 'verified-empty'
  && evidence.firstParty === true
  && evidence.listingComplete === true
  && Boolean(toHttpUrl(evidence.surface))
  && toNonNegativeInteger(evidence.pagesFetched, -1) >= 1
  && (evidence.reportedTotal == null || toOptionalNonNegativeInteger(evidence.reportedTotal) === 0)
  && (evidence.indiaFacetCount == null || toOptionalNonNegativeInteger(evidence.indiaFacetCount) === 0)
  && Boolean(toIsoTimestamp(evidence.verifiedAt))
)

export const normalizeInventoryEvidence = (evidence = {}) => {
  const status = INVENTORY_STATUSES.has(evidence?.status)
    ? evidence.status
    : 'unverified'
  const normalized = {
    status,
    surface: toHttpUrl(evidence?.surface),
    firstParty: evidence?.firstParty === true,
    listingComplete: evidence?.listingComplete === true,
    pagesFetched: toNonNegativeInteger(evidence?.pagesFetched),
    reportedTotal: toOptionalNonNegativeInteger(evidence?.reportedTotal),
    indiaFacetCount: toOptionalNonNegativeInteger(evidence?.indiaFacetCount),
    verifiedAt: toIsoTimestamp(evidence?.verifiedAt),
    reason: String(evidence?.reason ?? '').trim() || null,
  }

  if (status === 'verified-empty' && !isVerifiedEmptyEvidence(normalized)) {
    return invalidEvidence()
  }

  return normalized
}

export const attachInventoryEvidence = (jobs, evidence) => {
  if (!Array.isArray(jobs)) {
    throw new TypeError('Inventory evidence can only be attached to a jobs array')
  }

  Object.defineProperty(jobs, INVENTORY_EVIDENCE, {
    configurable: true,
    value: normalizeInventoryEvidence(evidence),
  })
  return jobs
}

export const readInventoryEvidence = (jobs) => (
  Array.isArray(jobs) ? jobs[INVENTORY_EVIDENCE] || null : null
)

// Array.map drops non-enumerable inventory metadata. Company wrappers use this
// when adding labels or timestamps to a shared adapter's validated results.
export const mapJobsWithInventoryEvidence = (jobs, transform) => {
  const mapped = jobs.map(transform)
  const evidence = readInventoryEvidence(jobs)
  if (!evidence) return mapped
  const incomplete = mapped.some(job => job?.sourceListingComplete === false)
  return attachInventoryEvidence(mapped, incomplete ? { ...evidence, status: 'discovery-only', listingComplete: false,
    reason: 'company-wrapper-limited-inventory' } : evidence)
}

/** A complete current check needs fetched inventory, not just a status label. */
export const isFreshCompleteInventoryEvidence = (evidence, {
  now = new Date(), maxAgeHours = 48,
} = {}) => {
  if (!evidence || evidence.firstParty !== true || evidence.listingComplete !== true
    || !toHttpUrl(evidence.surface) || toNonNegativeInteger(evidence.pagesFetched, -1) < 1
    || !['complete-inventory', 'verified-empty'].includes(evidence.status)) return false
  const at = toIsoTimestamp(evidence.verifiedAt)
  const reference = toIsoTimestamp(now)
  if (!at || !reference || !(maxAgeHours > 0)) return false
  const age = new Date(reference) - new Date(at)
  return age >= 0 && age <= maxAgeHours * 3600000
    && (evidence.status !== 'verified-empty' || isVerifiedEmptyEvidence(evidence))
}
