const TRUTHY_ENV_PATTERN = /^(?:1|true|yes|on)$/i

export const FALLBACK_PARALLEL_SCRAPER_CONCURRENCY = 1
export const RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY = 2

const isTruthyEnvFlag = (value) => TRUTHY_ENV_PATTERN.test(String(value ?? '').trim())
const parsePositiveConcurrency = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const resolveConfiguredParallelScraperConcurrency = (
  value = process.env.SCRAPER_CONCURRENCY,
  fallbackConcurrency = FALLBACK_PARALLEL_SCRAPER_CONCURRENCY,
) => parsePositiveConcurrency(value) ?? fallbackConcurrency

export const resolveRecommendedLocalDryRunConcurrency = (
  value = process.env.SCRAPER_RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY,
  fallbackConcurrency = RECOMMENDED_LOCAL_DRY_RUN_CONCURRENCY,
) => parsePositiveConcurrency(value) ?? fallbackConcurrency

export const resolveParallelWorkerConcurrency = ({
  requested = process.env.SCRAPER_CONCURRENCY,
  dryRun = false,
  defaultConcurrency = resolveConfiguredParallelScraperConcurrency(),
  recommendedDryRunConcurrency = resolveRecommendedLocalDryRunConcurrency(),
  allowUnsafeDryRunConcurrency = process.env.SCRAPER_ALLOW_UNSAFE_DRY_RUN_CONCURRENCY,
} = {}) => {
  const normalizedRequested = parsePositiveConcurrency(requested) ?? defaultConcurrency

  if (
    !dryRun
    || normalizedRequested <= recommendedDryRunConcurrency
    || isTruthyEnvFlag(allowUnsafeDryRunConcurrency)
  ) {
    return {
      requested: normalizedRequested,
      effective: normalizedRequested,
      clamped: false,
    }
  }

  return {
    requested: normalizedRequested,
    effective: recommendedDryRunConcurrency,
    clamped: true,
  }
}
