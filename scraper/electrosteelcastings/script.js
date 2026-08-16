import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.electrosteel.com/'
export const CAREERS_URL = 'https://www.electrosteel.com/career'
export const LEGACY_CAREERS_ENQUIRY_URL = 'https://www.electrosteel.com/careers-enquiry.php'
export const LEGACY_LIFE_AT_URL = 'https://www.electrosteel.com/careers/life_electrosteel.php'
export const VERIFIED_ON = '2026-08-14'

export const SOURCE = 'electrosteelcastings'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Home\s*\|\s*Electrosteel Castings Limited\s*<\/title>/i.test(page)
    && text.includes('MANUFACTURING EXCELLENCE.')
    && text.includes('A proud make in india company With Global Outreach')
    && text.includes('largest manufacturer of Ductile Iron (DI) Pipes')
}

export const hasCareerInfoOnlySignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Electrosteel\s*<\/title>/i.test(page)
    && text.includes('Build the Future with Electrosteel Castings Limited')
    && text.includes('WHY JOIN ELECTROSTEEL')
    && text.includes('OUR PROMISE')
    && text.includes('Explore Opportunities at Electrosteel')
    && text.includes('Khoj The Campus Drive')
    && text.includes('Roles Offered Under Khoj')
    && !/employment_form\.pdf/i.test(page)
    && !/apply now/i.test(text)
}

export const hasBrandedMissingRouteSignal = (html) => {
  const text = normalizeWhitespace(html)

  return text.includes('404 / Page Not Found')
    && text.includes('THIS PAGE IS OFF THE GRID.')
    && text.includes('Routing Status 404')
    && text.includes('Destination unavailable.')
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })

  return {
    status: response.status,
    url: response.url || url,
    html: await response.text(),
  }
}

export const createElectrosteelCastingsScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchPage = defaultFetchPage,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Electrosteel homepage no longer matches the verified official public site')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasCareerInfoOnlySignal(careersHtml)) {
      throw new Error('Electrosteel career information page no longer matches the verified official no-openings surface')
    }

    for (const legacyUrl of [LEGACY_CAREERS_ENQUIRY_URL, LEGACY_LIFE_AT_URL]) {
      const legacyPage = await fetchPage(legacyUrl)
      if (Number(legacyPage?.status) !== 404 || !hasBrandedMissingRouteSignal(legacyPage?.html)) {
        throw new Error('Electrosteel legacy careers routes no longer match the verified first-party missing-page surface')
      }
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
