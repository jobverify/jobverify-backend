import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { SCOPE_EKNOWLEDGE_CENTER_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_ROUTES = [
  HOMEPAGE_URL,
  'https://www.scopeknowledge.com/careers',
  'https://www.scopeknowledge.com/jobs',
  'https://www.scopeknowledge.com/join-us',
]
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const defaultFetchPage = async (url) => {
  try {
    const html = await fetchTextWithRetry(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      label: SOURCE,
      timeoutMs: 15000,
    })

    return { status: 200, url, html }
  } catch (error) {
    const message = String(error?.message ?? error)
    const statusMatch = message.match(/\bHTTP\s+(\d{3})\b/i)
    if (statusMatch) {
      return { status: Number(statusMatch[1]), url, html: message }
    }
    throw error
  }
}

export const isBlockedResponse = ({ status, html } = {}) =>
  Number(status) === 403 && /403|forbidden/i.test(String(html ?? ''))

export const createScopeEknowledgeCenterScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const pages = []
    for (const url of CAREERS_ROUTES) {
      pages.push(await fetchPage(url))
    }

    if (pages.every((page) => isBlockedResponse(page))) {
      return []
    }

    throw new Error('Scope eKnowledge Center verified exact-name surface changed materially')
  },
})

export const run = async (options = {}) => createScopeEknowledgeCenterScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
