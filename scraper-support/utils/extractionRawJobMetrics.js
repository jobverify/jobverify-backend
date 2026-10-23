const data = (value, key) => {
  if (!value || typeof value !== 'object') return undefined
  try { return Object.getOwnPropertyDescriptor(value, key)?.value } catch { return undefined }
}
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000

export function extractionRawJobMetrics(provider, jobs, inventoryEvidence) {
  const reported = data(inventoryEvidence, 'reportedTotal')
  if (count(reported)) return { rawJobs: reported, rawJobsBasis: 'inventory-reported-total' }
  const native = data(data(jobs, '0'), 'nativeCollectionEvidence')
  const observed = data(native, 'observedListingCount'), sourceMatches = data(native, 'source') === provider.source
  if (sourceMatches && count(observed) && observed >= jobs.length) return { rawJobs: observed, rawJobsBasis: 'observed-native-listing-rows' }
  return { rawJobs: jobs.length, rawJobsBasis: 'extracted-jobs-fallback',
    ...(sourceMatches && count(observed) && observed < jobs.length ? { rawJobsCountConflict: true } : {}) }
}
