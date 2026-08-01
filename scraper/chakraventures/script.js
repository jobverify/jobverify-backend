import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://chakraventures.com/'
export const CAREERS_URL = 'https://chakraventures.com/careers'
export const JOBS_URL = 'https://chakraventures.com/jobs'
export const LANDER_URL = 'https://chakraventures.com/lander'

const PUBLIC_JOB_LISTINGS_PATTERN =
  /\b(open roles|open positions|current openings|job openings|available positions|apply now|join our team)\b|jobs\.lever\.co|boards\.greenhouse\.io|ashbyhq\.com|workdayjobs|smartrecruiters|job-boards\.greenhouse\.io/i

export const hasRedirectToLanderSignal = (html) =>
  /window\.location\.href\s*=\s*["']\/lander["']/i.test(String(html ?? ''))

export const hasParkedLanderSignal = (html) => {
  const page = String(html ?? '')

  return /window\.LANDER_SYSTEM\s*=\s*["']PW["']/i.test(page)
    && /_trfd\.push\(\{ap:\s*["']parking["']\}\)/i.test(page)
    && /img1\.wsimg\.com\/parking-lander/i.test(page)
}

export const hasPublicJobListingsSignal = (html) =>
  PUBLIC_JOB_LISTINGS_PATTERN.test(String(html ?? ''))

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'chakraventures',
  timeoutMs: 15000,
})

export const createChakraVenturesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    const careersHtml = await fetchText(CAREERS_URL)
    const jobsHtml = await fetchText(JOBS_URL)

    if (
      hasPublicJobListingsSignal(homepageHtml)
      || hasPublicJobListingsSignal(careersHtml)
      || hasPublicJobListingsSignal(jobsHtml)
    ) {
      throw new Error('Chakra Ventures first-party routes now appear to expose public jobs')
    }

    if (
      !hasRedirectToLanderSignal(homepageHtml)
      || !hasRedirectToLanderSignal(careersHtml)
      || !hasRedirectToLanderSignal(jobsHtml)
    ) {
      throw new Error('Chakra Ventures verified parked first-party surface changed')
    }

    const landerHtml = await fetchText(LANDER_URL)

    if (hasPublicJobListingsSignal(landerHtml)) {
      throw new Error('Chakra Ventures parked lander now appears to expose public jobs')
    }

    if (!hasParkedLanderSignal(landerHtml)) {
      throw new Error('Chakra Ventures parked lander no longer matches the verified first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createChakraVenturesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Chakra Ventures scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'chakraventures')
    console.log('DB result:', result)
    process.exit(0)
  }
}
