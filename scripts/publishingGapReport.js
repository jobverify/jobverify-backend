import { classifyProviderImplementation } from './reportScriptCatalogTopology.js'
import { isVerifiedEmptyEvidence, isFreshCompleteInventoryEvidence } from '../scraper-support/utils/inventoryEvidence.js'

const metric = value => Number.isSafeInteger(value) && value >= 0 ? value : null
const timestamp = value => {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.getTime() > 0 ? date.toISOString() : null
}
const companyKey = value => String(value || '').trim().toLowerCase()
const countBy = (rows, field) => rows.reduce((counts, row) => {
  counts[row[field]] = (counts[row[field]] || 0) + 1
  return counts
}, {})
const fresh = (value, now, maxAgeHours) => {
  const date = timestamp(value)
  return Boolean(date && new Date(date) <= now && now - new Date(date) <= maxAgeHours * 3600000)
}
const latestExploration = row => row.extractionAuditFresh && (!row.discoveryFresh
  || new Date(row.extractionAuditAt) >= new Date(row.discoveryAt)) ? 'audit' : row.discoveryFresh ? 'discovery' : null
const exploredEligibleJobs = row => latestExploration(row) === 'audit' ? row.extractionAuditEligibleJobs
  : latestExploration(row) === 'discovery' ? row.discoveredEligibleJobs : row.eligibleJobs

const attemptFor = (source, status, runState) => {
  // Legacy status counters survive failed/partial attempts. They are not the
  // results of lastRanAt and must never supply latest-attempt job counts.
  const savedAttempt = status?.latestAttempt
  const legacyAt = timestamp(status?.lastRanAt)
  const savedAt = timestamp(savedAttempt?.recordedAt || savedAttempt?.completedAt)
  // Older deployed runners update legacy fields without updating latestAttempt.
  // A recordedAt timestamp ties modern diagnostics to their status write. Older
  // diagnostics allow one second for the result-to-status persistence boundary.
  const legacyIsNewer = legacyAt && (!savedAt || new Date(legacyAt) - new Date(savedAt) > (savedAttempt?.recordedAt ? 0 : 1000))
  let attempt = (!legacyIsNewer && savedAttempt) || (legacyAt ? {
    completedAt: legacyAt,
    success: status.lastSuccess === true && status.softFailure !== true,
    softFailure: status.softFailure,
    failureKind: status.failureKind,
    error: status.lastError,
    staleCheckSkipped: Boolean(status.lastPartialAt && timestamp(status.lastPartialAt) === timestamp(status.lastRanAt)),
    historicalDiagnosticsMissing: true,
  } : null)
  const checkpoint = runState?.completed?.[source]
  const checkpointAttempt = checkpoint ? { ...checkpoint.result,
    completedAt: checkpoint.result?.completedAt || checkpoint.completedAt,
    evidenceOrigin: 'checkpoint', mode: runState.mode || null,
  } : null
  if (checkpointAttempt && (!attempt || new Date(checkpointAttempt.completedAt) >= new Date(attempt.completedAt || 0))) attempt = checkpointAttempt
  const pendingAt = timestamp(runState?.inProgress?.[source]?.startedAt)
  if (pendingAt && (!attempt || new Date(pendingAt) > new Date(attempt.completedAt || 0))) {
    attempt = { attemptedAt: pendingAt, pending: true, evidenceOrigin: 'checkpoint', mode: runState.mode || null }
  }
  return attempt
}

export const buildPublishingGapReport = ({ catalog = [], runtime = null, runState = null, discovery = [], extractionAudits = [],
  now = new Date(), maxAgeHours = 48, classifyImplementation = classifyProviderImplementation,
} = {}) => {
  now = new Date(now)
  if (!Number.isFinite(now.getTime()) || !(maxAgeHours > 0)) throw new TypeError('Valid now and positive maxAgeHours required')
  const databaseAvailable = runtime?.databaseAvailable === true
  const inventory = new Map((databaseAvailable ? runtime.inventory || [] : []).map(row => [row.source, row]))
  const statuses = new Map((runtime?.statuses || []).map(row => [row.source, row]))
  const discoveries = new Map(discovery.map(row => [row.source, row]))
  const audits = new Map(extractionAudits.map(row => [row.source, row]))
  const providers = [...new Map(catalog.map(p => [p.source, p])).values()].sort((a, b) => a.source.localeCompare(b.source))
  const rows = providers.map(provider => {
    const status = statuses.get(provider.source)
    const attempt = attemptFor(provider.source, status, runState)
    const implementation = classifyImplementation(provider)
    const current = inventory.get(provider.source)
    const discovered = discoveries.get(provider.source)
    const audited = audits.get(provider.source)
    const discoveryFresh = fresh(discovered?.completedAt, now, maxAgeHours)
    const extractionAuditFresh = fresh(audited?.completedAt, now, maxAgeHours)
    const candidate = discovered?.candidate
    const sharedAtsSources = candidate?.boardToken ? providers.filter(other => other.source !== provider.source
      && other.atsPlatform === candidate.atsPlatform && other.boardToken === candidate.boardToken
      && inventory.get(other.source)?.visibleJobs > 0).map(other => other.source) : []
    const evidence = attempt?.inventoryEvidence || null
    const evidenceFresh = fresh(evidence?.verifiedAt, now, maxAgeHours)
    const attemptFresh = fresh(attempt?.completedAt || attempt?.attemptedAt, now, maxAgeHours)
    const completeEvidence = isFreshCompleteInventoryEvidence(evidence, { now, maxAgeHours })
      && isFreshCompleteInventoryEvidence(evidence, { now: attempt?.completedAt || now, maxAgeHours })
    const partial = attempt?.staleCheckSkipped === true || attempt?.partial === true
    let runtimeOutcome = 'not-observed'
    if (attempt?.pending) runtimeOutcome = 'in-progress'
    else if (attempt?.skipped) runtimeOutcome = 'skipped'
    else if (attempt?.failureKind === 'coverage_gap' || attempt?.zeroJobEvidence === 'coverage-gap') runtimeOutcome = 'coverage-gap'
    else if (attempt?.success === false || attempt?.softFailure === true) runtimeOutcome = 'failed'
    else if (partial) runtimeOutcome = 'partial'
    else if (attempt?.success === true) {
      if (metric(attempt.jobs) === 0) runtimeOutcome = completeEvidence
        ? (isVerifiedEmptyEvidence(evidence) ? 'verified-zero' : 'no-india-jobs') : 'unverified-zero'
      else if (metric(attempt.eligibleJobs) === 0) runtimeOutcome = 'jobs-rejected'
      else if (metric(attempt.eligibleJobs) > 0) runtimeOutcome = 'eligible-jobs'
      else runtimeOutcome = 'diagnostics-missing'
    }
    const visibleJobs = databaseAvailable ? metric(current?.visibleJobs ?? 0) : null
    const savedJobs = databaseAvailable ? metric(current?.savedJobs ?? 0) : null
    const rejectionCounts = Object.fromEntries(['NonIndia', 'Closed', 'InvalidUrl', 'EmptyDescription', 'NonJob', 'Old']
      .map(name => [name[0].toLowerCase() + name.slice(1), metric(attempt?.[`filtered${name}`])]))
    return {
      source: provider.source, companyName: provider.companyName || provider.company || provider.source,
      implementationType: implementation.type, implementationReason: implementation.reason,
      zeroResultPolicy: provider.zeroResultPolicy || null,
      latestAttemptAt: timestamp(attempt?.attemptedAt || attempt?.completedAt),
      latestAttemptCompletedAt: timestamp(attempt?.completedAt),
      lastCompleteCheckAt: timestamp(status?.lastCompleteCheckAt || (completeEvidence && attempt?.success === true && !partial && !attempt.skipped ? attempt.completedAt : null)),
      attemptFresh, evidenceFresh, evidenceOrigin: attempt?.evidenceOrigin || (attempt ? 'database-status' : null),
      evidenceMode: attempt?.mode || (attempt ? 'live' : null),
      runtimeOutcome, publicationOutcome: databaseAvailable ? (visibleJobs > 0 ? 'published' : 'not-published') : 'unknown',
      rawJobs: metric(attempt?.rawRecords), indiaJobs: metric(attempt?.jobs), eligibleJobs: metric(attempt?.eligibleJobs),
      upstreamReportedJobs: metric(evidence?.reportedTotal),
      savedJobs, visibleJobs, visibleCompanies: current?.visibleCompanies || [], rejectionCounts,
      completeSuccessfulCheck: attemptFresh && attempt?.success === true && !attempt.softFailure && !partial && !attempt.skipped && completeEvidence,
      inventoryEvidence: evidence, zeroJobEvidence: attempt?.zeroJobEvidence || null,
      failureKind: attempt?.failureKind || null, error: attempt?.error || null,
      careerPage: provider.companyCareerPage || null,
      discoveryOutcome: discovered?.outcome || null, discoveryAt: timestamp(discovered?.completedAt), discoveryFresh,
      discoveryEvidence: discovered?.discovery || null,
      discoveredAtsBoard: candidate ? { atsPlatform: candidate.atsPlatform, boardToken: candidate.boardToken,
        bindingEvidence: candidate.bindingEvidence, sharedPublishedSources: sharedAtsSources } : null,
      discoveredEligibleJobs: discoveryFresh ? metric(discovered?.eligibleJobs) : null,
      extractionAuditOutcome: audited?.outcome || null, extractionAuditAt: timestamp(audited?.completedAt), extractionAuditFresh,
      extractionAuditEligibleJobs: extractionAuditFresh ? metric(audited?.eligibleJobs) : null,
      extractionAuditEvidence: audited ? { inventoryEvidence: audited.inventoryEvidence, failureCode: audited.failureCode || null,
        failureKind: audited.failureKind || null } : null,
      historicalVerification: { verifiedOn: provider.verifiedOn || null, summary: provider.verifiedSurfaceSummary || null },
    }
  })
  const namesToSources = new Map()
  for (const row of rows) for (const name of new Set(row.visibleCompanies.map(companyKey).filter(Boolean))) {
    if (!namesToSources.has(name)) namesToSources.set(name, [])
    namesToSources.get(name).push(row.source)
  }
  const catalogSources = new Set(rows.map(row => row.source))
  const publicNames = databaseAvailable ? new Set((runtime.publicCompanyNames || []).map(companyKey).filter(Boolean)) : null
  const snapshotFresh = databaseAvailable && fresh(runtime.generatedAt, now, maxAgeHours)
  const backlog = rows.filter(row => row.publicationOutcome !== 'published').map(row => ({
    source: row.source, companyName: row.companyName, implementationType: row.implementationType,
    reason: row.discoveredAtsBoard?.sharedPublishedSources?.length ? 'reconcile-shared-published-ats-board'
      : latestExploration(row) === 'audit' ? row.extractionAuditOutcome
      : latestExploration(row) === 'discovery' && row.discoveryOutcome !== 'already-published-not-rechecked' ? row.discoveryOutcome
      : row.runtimeOutcome === 'not-observed' ? row.implementationReason : row.runtimeOutcome,
    careerPage: row.careerPage, discoveryRequired: true,
    priority: row.discoveredAtsBoard?.sharedPublishedSources?.length ? 3
      : exploredEligibleJobs(row) > 0 ? 0
      : ['sentinel', 'static-empty', 'missing-module'].includes(row.implementationType) ? 1 : 2,
    observedEligibleJobs: exploredEligibleJobs(row),
    evidence: { discoveryAt: row.discoveryAt, extractionAuditAt: row.extractionAuditAt,
      discoveredAtsBoard: row.discoveredAtsBoard, extractionAudit: row.extractionAuditEvidence },
  })).sort((a, b) => a.priority - b.priority || (b.observedEligibleJobs || 0) - (a.observedEligibleJobs || 0) || a.source.localeCompare(b.source))
  return {
    schemaVersion: 1, generatedAt: now.toISOString(), freshnessHours: maxAgeHours,
    coverageLabel: 'Catalog registration coverage',
    summary: {
      registeredSources: rows.length,
      implementedSources: rows.filter(row => ['script', 'shared-adapter'].includes(row.implementationType)).length,
      completeSuccessfulChecks: rows.filter(row => row.completeSuccessfulCheck).length,
      sourcesWithoutAttemptDiagnostics: rows.filter(row => row.rawJobs == null || row.indiaJobs == null || row.eligibleJobs == null).length,
      verifiedZeroInventories: rows.filter(row => row.runtimeOutcome === 'verified-zero' && row.attemptFresh).length,
      coverageGaps: rows.filter(row => row.zeroResultPolicy === 'coverage-gap' || row.runtimeOutcome === 'coverage-gap' || ['sentinel', 'static-empty', 'missing-module', 'unreadable-module'].includes(row.implementationType)).length,
      failures: rows.filter(row => row.runtimeOutcome === 'failed').length,
      sourcesWithVisibleJobs: databaseAvailable ? rows.filter(row => row.visibleJobs > 0).length : null,
      distinctVisibleCompanies: publicNames?.size ?? null,
      distinctVisibleCompaniesFromCatalog: databaseAvailable ? namesToSources.size : null,
      runtimeReconciliationComplete: snapshotFresh && Array.isArray(runtime?.publicCompanyNames) && Array.isArray(runtime?.inventory),
      runtimeSnapshotAt: timestamp(runtime?.generatedAt),
      runtimeEnvironment: runtime?.environment || (databaseAvailable ? 'provided-snapshot' : null),
      implementationCounts: countBy(rows, 'implementationType'), runtimeOutcomeCounts: countBy(rows, 'runtimeOutcome'),
      discoveryOutcomeCounts: countBy(rows.filter(row => row.discoveryOutcome), 'discoveryOutcome'),
      extractionAuditOutcomeCounts: countBy(rows.filter(row => row.extractionAuditOutcome), 'extractionAuditOutcome'),
    },
    limitations: [
      ...(!databaseAvailable ? ['Current database inventory unavailable; saved and visible counts are unknown.'] : []),
      ...(databaseAvailable && !snapshotFresh ? ['Database snapshot is stale or undated; regenerate before comparing public counts.'] : []),
      'Historical provider verification is discovery context, not proof of current openings or a complete inventory.',
      'Implemented sources counts executable candidates; completeSuccessfulChecks requires fresh first-party inventory evidence.',
      'Zero observed complete checks does not establish zero successful historical scrapes; missing historical diagnostics remain unknown.',
      'Discovery and isolated extraction audits do not replace production attempt records or prove public visibility. A supported ATS feed with no India roles does not rule out other recruitment channels.',
    ],
    reconciliation: {
      untrackedSources: [...inventory.keys()].filter(source => !catalogSources.has(source)).sort(),
      sharedPublicCompanyNames: [...namesToSources].filter(([, sources]) => sources.length > 1).map(([company, sources]) => ({ company, sources })),
      aliasPublications: rows.filter(row => row.visibleJobs > 0 && !row.visibleCompanies.some(name => companyKey(name) === companyKey(row.companyName)))
        .map(row => ({ source: row.source, catalogCompany: row.companyName, visibleCompanies: row.visibleCompanies })),
    },
    rows, backlog,
  }
}

export const publishingGapCsv = rows => {
  const fields = ['source', 'companyName', 'implementationType', 'runtimeOutcome', 'publicationOutcome', 'latestAttemptAt', 'latestAttemptCompletedAt',
    'lastCompleteCheckAt', 'attemptFresh', 'evidenceFresh', 'evidenceMode', 'rawJobs', 'upstreamReportedJobs', 'indiaJobs', 'eligibleJobs', 'savedJobs', 'visibleJobs',
    'visibleCompanies', 'rejectionCounts', 'zeroJobEvidence', 'inventoryEvidence', 'failureKind', 'error', 'careerPage',
    'discoveryOutcome', 'discoveryAt', 'discoveryFresh', 'discoveredEligibleJobs', 'discoveredAtsBoard', 'discoveryEvidence',
    'extractionAuditOutcome', 'extractionAuditAt', 'extractionAuditFresh', 'extractionAuditEligibleJobs', 'extractionAuditEvidence']
  const escape = value => {
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return `${[fields.join(','), ...rows.map(row => fields.map(field => escape(row[field])).join(','))].join('\n')}\n`
}
