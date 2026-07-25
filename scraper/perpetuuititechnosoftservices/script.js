import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PERPETUUITI_TECHNOSOFT_SERVICES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_FORM_URL = PROVIDER_METADATA.applicationFormUrl

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#8217;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    text: await response.text(),
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('We empower people who perform!')
    && /great people/i.test(normalized)
    && /open positions/i.test(normalized)
}

export const hasCareersFormLink = (html = '') => /Careers-Form\.php/i.test(String(html ?? ''))

export const isExpectedBrokenCareersFormResponse = ({ status, text } = {}) =>
  Number(status) === 500 && /internal server error/i.test(String(text ?? ''))

export const createPerpetuuitiTechnosoftServicesScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (Number(careersPage.status) !== 200 || !hasOfficialCareersSignal(careersPage.text)) {
      throw new Error('The verified Perpetuuiti careers page changed materially')
    }

    if (!hasCareersFormLink(careersPage.text)) {
      throw new Error('The verified Perpetuuiti careers page no longer links to the known application form handoff')
    }

    const applicationFormPage = await fetchPage(CAREERS_FORM_URL)
    if (!isExpectedBrokenCareersFormResponse(applicationFormPage)) {
      throw new Error('The verified Perpetuuiti broken careers form handoff changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createPerpetuuitiTechnosoftServicesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
