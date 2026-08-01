import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.electrosteel.com/'
export const CAREERS_URL = 'https://www.electrosteel.com/careers-enquiry.php'
export const LIFE_AT_URL = 'https://www.electrosteel.com/careers/life_electrosteel.php'
export const EMPLOYMENT_FORM_URL = 'https://www.electrosteel.com/pdf/employment_form.pdf'

const SOURCE = 'electrosteelcastings'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /Electrosteel Castings Limited/i.test(page)
    && /Careers/i.test(page)
    && /Life @ Electrosteel/i.test(page)
    && /Join us/i.test(page)
}

export const hasApplicationOnlyCareerSignal = (html) => {
  const page = String(html ?? '')
  return /Careers Enquiry/i.test(page)
    && /Step 1:\s*Download Employment Form/i.test(page)
    && /Step 2:\s*Fill in your details/i.test(page)
    && /Step 3:\s*Upload Employment Form/i.test(page)
    && /employment_form\.pdf/i.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createElectrosteelCastingsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Electrosteel homepage no longer matches the verified official public site')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasApplicationOnlyCareerSignal(careersHtml)) {
      throw new Error('Electrosteel careers enquiry page no longer matches the verified official application-only surface')
    }

    return []
  },
})

export const run = async (options = {}) => createElectrosteelCastingsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Electrosteel Castings scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
