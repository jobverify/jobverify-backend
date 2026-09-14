import path from 'path'
import { fileURLToPath } from 'url'

import { createPhenomScraper } from '../../scraper-support/phenom/engine.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const isOrangeBusinessJob = (job) => (job?.companyName || job?.company) === 'Orange Business'

const scraper = createPhenomScraper({
  companyName: 'Orange Business',
  source: 'orangebusiness',
  baseUrl: 'https://orange.jobs',
  searchPath: '/gb/en/search-results?companyName=Orange%20Business',
  listingPredicate: isOrangeBusinessJob,
  scraperDir: currentDir,
})

export const {
  buildSearchResultsPageUrl,
  buildJobDetailUrl,
  extractSearchPayload,
  extractSearchResults,
  extractJobDetail,
} = scraper

// The public HTML ignores companyName in its URL. The advertised widget facets
// apply both company and country scope; shared inventory checks still own raw
// completeness, pagination, cancellation and the optional detail budget.
export const run = (options = {}) => {
  const getJson = options.fetchJson || fetchJsonWithRetry
  const getDetailText = options.fetchText || fetchTextWithRetry
  return scraper.run({
    ...options,
    useWidgetApi: false,
    fetchText: async (url, requestOptions = {}) => {
      const parsedUrl = new URL(url)
      if (parsedUrl.origin !== 'https://orange.jobs' || parsedUrl.pathname !== '/gb/en/search-results') {
        return getDetailText(url, { ...requestOptions, attempts: 1, timeoutMs: 15000, label: 'orangebusiness detail' })
      }
      const response = await getJson('https://orange.jobs/widgets', {
        ...requestOptions,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        attempts: 2,
        timeoutMs: 15000,
        label: 'orangebusiness listings',
        body: JSON.stringify({
          lang: 'en_gb', deviceType: 'desktop', country: 'gb',
          pageName: 'search-results', ddoKey: 'refineSearch', jobs: true, counts: true,
          all_fields: ['country', 'companyName'], size: 500, global: true, keywords: '',
          sortBy: 'Most recent', sort: { field: 'postedDate', order: 'desc' },
          selected_fields: { country: ['INDIA'], companyName: ['Orange Business'] },
          from: Number(parsedUrl.searchParams.get('from') || 0),
        }),
      })
      const payload = response?.refineSearch
      if (payload?.status !== 200 || !Array.isArray(payload.data?.jobs)) {
        throw new Error('PHENOM_INCOMPLETE_SNAPSHOT: Orange public widget returned an invalid listing payload')
      }
      if (payload.data.jobs.some((job) => !isOrangeBusinessJob(job))) {
        throw new Error('PHENOM_INCOMPLETE_SNAPSHOT: Orange public widget lost its company scope')
      }
      return '<script>phApp.ddo = ' + JSON.stringify({ eagerLoadRefineSearch: payload }) + '</script>'
    },
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Orange Business scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)
  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'orangebusiness')
    console.log('DB result:', result)
    process.exit(0)
  }
}
