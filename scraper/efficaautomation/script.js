import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.effica.in/'
export const CAREERS_URL = 'https://www.effica.in/careers.html'
export const CONTACT_URL = 'https://www.effica.in/contact-us.html'
export const CAREERS_EMAIL = 'hr@effica.in'

const SOURCE = 'efficaautomation'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /Effica Automation Limited/i.test(page)
    && /Coimbatore,\s*India/i.test(page)
    && /careers\.html/i.test(page)
}

export const hasApplicationOnlyCareersSignal = (html) => {
  const page = String(html ?? '')
  return /People at Effica/i.test(page)
    && /Life at Effica/i.test(page)
    && /Jobs at Effica/i.test(page)
    && !/apply now|job opening|download jd|greenhouse|lever|workday/i.test(page)
}

export const hasHiringContactSignal = (html) => {
  const page = String(html ?? '')
  return /Business Enquiry Form/i.test(page)
    && /contact\.php/i.test(page)
    && new RegExp(CAREERS_EMAIL.replace('.', '\\.'), 'i').test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createEfficaAutomationScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Effica homepage no longer matches the verified official public site')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasApplicationOnlyCareersSignal(careersHtml)) {
      throw new Error('Effica careers page no longer matches the verified official application-only surface')
    }

    const contactHtml = await fetchText(CONTACT_URL)
    if (!hasHiringContactSignal(contactHtml)) {
      throw new Error('Effica contact page no longer exposes the verified public hiring contact signal')
    }

    return []
  },
})

export const run = async (options = {}) => createEfficaAutomationScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Effica Automation scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
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
