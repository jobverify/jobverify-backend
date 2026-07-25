import path from 'path'
import { fileURLToPath } from 'url'

export const CAREER_PAGE_URL = 'https://www.finolexpipes.com/career/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasOfficialCareersSignal = (html) =>
  /Careers(?:\s|&amp;)+Jobs Opportunities \|\s*Work with Finolex Pipes/i.test(html || '')
  && /Job Openings/i.test(html || '')
  && /Discover Your Career Path/i.test(html || '')
  && /career@finolexind\.com/i.test(html || '')

export const hasEmptyOpeningsSignal = (html) =>
  /There are currently no open positions matching your search criteria\./i.test(html || '')
  && /Apply via Mail/i.test(html || '')
  && /Apply via Whatsapp/i.test(html || '')

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createFinolexIndustriesLimitedScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREER_PAGE_URL)

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('Finolex careers page no longer matches the verified official public surface')
    }

    if (!hasEmptyOpeningsSignal(html)) {
      throw new Error('Finolex careers page no longer matches the verified no-open-positions surface')
    }

    return []
  },
})

export const run = async () => createFinolexIndustriesLimitedScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Finolex Industries Limited scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'finolexindustrieslimited')
    console.log('DB result:', result)
    process.exit(0)
  }
}
