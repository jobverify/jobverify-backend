import path from 'path'
import { fileURLToPath } from 'url'

export const CAREER_PAGE_URL = 'https://www.finolexpipes.com/career/'
export const VERIFIED_ON = '2026-08-07'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasOfficialCareersSignal = (html) =>
  /<title>\s*Careers\s*&(?:amp;)?\s*Jobs Opportunities \|\s*Work with Finolex Pipes\s*<\/title>/i.test(html || '')
  && /Job Openings/i.test(html || '')
  && /Discover Your Career Path/i.test(html || '')
  && /Join Us/i.test(html || '')
  && /Managing Director,\s*Finolex Industries Ltd\./i.test(html || '')

export const extractDepartmentOptions = (html) => [...(html || '').matchAll(
  /<div\s+class=["']option["']\s+data-value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/div>/gi,
)]
  .map(([, value, label]) => ({
    value: value.trim(),
    label: label.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  }))
  .filter(({ value, label }) => value && label && !/select department/i.test(label))

export const hasEmptyOpeningsSignal = (html) =>
  /id=["']jobListData["'][^>]*>\s*<\/div>/i.test(html || '')
  && /id=["']jobListNoData["'][^>]*>\s*There are currently no open positions matching your search criteria\.\s*<\/div>/i.test(html || '')
  && /id=["']jobDetailsDiv["'][^>]*>\s*<\/div>/i.test(html || '')
  && /id=["']modalJobDetails["'][^>]*>\s*<\/div>/i.test(html || '')
  && /Apply via Mail/i.test(html || '')
  && /Apply via Whatsapp/i.test(html || '')
  && /career@finolexind\.com/i.test(html || '')

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const createFinolexIndustriesLimitedScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const page = await fetchPage(CAREER_PAGE_URL)
    const { html, status } = page

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('Finolex careers page no longer matches the verified official public surface')
    }

    if (!hasEmptyOpeningsSignal(html)) {
      throw new Error('Finolex careers page no longer matches the verified no-open-positions surface')
    }

    if (status >= 400 && !/500 Internal Server Error/i.test(html)) {
      throw new Error(`HTTP ${status} for ${CAREER_PAGE_URL}`)
    }

    return []
  },
})

export const run = async () => createFinolexIndustriesLimitedScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
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
