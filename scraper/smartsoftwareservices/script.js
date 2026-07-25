import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SMART_SOFTWARE_SERVICES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SMART_SOFTWARE_SERVICES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return extractTitle(page) === 'Careers — Join Smart Software Services | Smart Software Services'
    && text.includes('Build the future with us: QA automation, React/Next.js, Node.js, and UI/UX roles.')
    && text.includes('4 Open roles')
    && text.includes('QA · FE · BE · Design')
    && page.includes('href="#open-positions"')
}

export const hasTrustworthyPublicApplySignal = (html = '') =>
  /href=["']https?:\/\/[^"']+(apply|jobs?|careers?)[^"']*["']/i.test(String(html ?? ''))

export const createSmartSoftwareServicesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Smart Software Services careers page no longer matches the verified first-party surface')
    }

    if (hasTrustworthyPublicApplySignal(careersHtml)) {
      throw new Error('Smart Software Services careers page now exposes public apply or job detail links')
    }

    return []
  },
})

export const run = async (options = {}) => createSmartSoftwareServicesScraper().run(options)

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
