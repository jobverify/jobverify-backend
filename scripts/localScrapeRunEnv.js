export const DEFAULT_LOCAL_SCRAPE_ENV = Object.freeze({
  SCRAPER_CONCURRENCY: '3',
  SCRAPER_FAILURE_ABORT_THRESHOLD: '1000',
  WORKDAY_SCRAPER_TIMEOUT_MS: '210000',
  WORKDAY_REQUEST_TIMEOUT_MS: '20000',
})

export const buildLocalScrapeRunEnv = (sourceEnv = process.env) => {
  const env = { ...sourceEnv }

  for (const [key, defaultValue] of Object.entries(DEFAULT_LOCAL_SCRAPE_ENV)) {
    env[key] = sourceEnv[key] || defaultValue
  }

  return env
}
