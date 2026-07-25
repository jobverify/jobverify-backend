import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'utopusinsights'
export const COMPANY = 'Utopus Insights'
export const CAREERS_URL = 'https://www.utopusinsights.com/careers'
export const OPEN_POSITIONS_URL = 'https://www.utopusinsights.com/open-positions'
export const BAMBOOHR_EMBED_URL = 'https://utopusinsights.bamboohr.com/jobs/embed2.php?version=1.0.0'

export const hasOfficialCareersSignal = (html) =>
  /https:\/\/www\.utopusinsights\.com\/careers|Join Our Team|href="\/open-positions"/i.test(html || '')

export const hasOfficialOpenPositionsSignal = (html) =>
  /https:\/\/utopusinsights\.bamboohr\.com\/js\/embed\.js|careers@utopusinsights\.com|Don(?:&rsquo;|')t see the job/i.test(html || '')

export const hasBambooHrHandoff = (html) =>
  /id="BambooHR"[^>]+data-domain="utopusinsights\.bamboohr\.com"|https:\/\/utopusinsights\.bamboohr\.com\/js\/embed\.js/i.test(html || '')

export const hasEmptyOpeningsSignal = (html) => String(html ?? '').trim().length === 0

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return response.text()
}

export const createUtopusInsightsScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const careersHtml = await fetchText(CAREERS_URL)
    const openingsHtml = await fetchText(OPEN_POSITIONS_URL)
    const bambooHrEmbedHtml = await fetchText(BAMBOOHR_EMBED_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Utopus Insights careers page no longer matches the verified official public surface')
    }

    if (!hasOfficialOpenPositionsSignal(openingsHtml)) {
      throw new Error('Utopus Insights open positions page no longer matches the verified official public surface')
    }

    if (!hasBambooHrHandoff(openingsHtml)) {
      throw new Error('Utopus Insights open positions page no longer exposes the verified BambooHR handoff')
    }

    if (!hasEmptyOpeningsSignal(bambooHrEmbedHtml)) {
      throw new Error('Utopus Insights BambooHR embed no longer matches the verified no-openings state')
    }

    return []
  },
})

export const run = async (options = {}) => createUtopusInsightsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ${COMPANY} scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
