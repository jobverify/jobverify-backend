import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'dittoinsurance'
export const COMPANY = 'Ditto Insurance'
export const OFFICIAL_HOME_URL = 'https://joinditto.in/'
export const OFFICIAL_CAREERS_URL = 'https://ditto.zappyhire.com/'

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasVerifiedOfficialCareersHandoff = (html = '') => {
  const page = String(html ?? '')
  return /\bDitto\b/i.test(page)
    && /href=["']https:\/\/ditto\.zappyhire\.com\/?["']/i.test(page)
    && /\bcareers?\b/i.test(page)
}

export const createDittoInsuranceScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(OFFICIAL_HOME_URL)

    if (!hasVerifiedOfficialCareersHandoff(homepageHtml)) {
      throw new Error(
        `Ditto Insurance official careers handoff changed materially: ${OFFICIAL_HOME_URL}`,
      )
    }

    // The trusted public surface has no stable, enumerable India feed we can verify.
    return []
  },
})

export const run = async (options = {}) => createDittoInsuranceScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
