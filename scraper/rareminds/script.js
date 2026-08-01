import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://rareminds.com/'
export const TALENT_APPLY_HOST = 'airtable.com'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasOfficialSiteSignal = (html) => /<title>\s*Rareminds\s*<\/title>|Unlisted talent\.\s*Confidential roles\.|Fixers,\s*not Recruiters/i
  .test(String(html ?? ''))

export const hasNoPublicListingsSignal = (html) => {
  const page = String(html ?? '')
  return /href=["'][^"']*airtable\.com\/[^"']*["'][^>]*>\s*Apply as Talent\s*<\/a>/i.test(page)
    && /You don[’']t need a resume\.\s*You need a reason\./i.test(page)
    && /The most brilliant minds don[’']t apply[\s-]*they[’']re discovered\./i.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'rareminds',
  timeoutMs: 15000,
})

export const createRaremindsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREER_PAGE_URL)

    if (!hasOfficialSiteSignal(html)) {
      throw new Error('Rareminds homepage no longer matches the verified official public surface')
    }

    if (!hasNoPublicListingsSignal(html)) {
      throw new Error('Rareminds homepage no longer matches the verified no-public-listings surface')
    }

    return []
  },
})

export const run = async (options = {}) => createRaremindsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Rareminds scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'rareminds')
    console.log('DB result:', result)
    process.exit(0)
  }
}
