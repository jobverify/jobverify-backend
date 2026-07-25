import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_PAGE_URL = 'https://www.alkemlabs.com/career'
export const CAREERS_HANDOFF_URL = 'https://careers.alkemlabs.com/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

export const hasOfficialCareersSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return (
    normalized.includes('alkem')
    && normalized.includes('career')
    && (
      normalized.includes('search jobs')
      || normalized.includes('build your career')
    )
  )
}

export const hasOfficialHandoffSignal = (html) =>
  String(html ?? '').toLowerCase().includes('careers.alkemlabs.com')

export const hasUnreachableCareersSignal = ({ status, html }) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return (
    status >= 400
    || normalized.includes('not found')
    || normalized.includes('access denied')
    || normalized.includes('forbidden')
  )
}

const isExpectedHandoffFailure = (error) => {
  const normalized = normalizeWhitespace(error?.message).toLowerCase()

  return (
    normalized.includes('enotfound')
    || normalized.includes('econnrefused')
    || normalized.includes('timed out')
    || normalized.includes('fetch failed')
    || normalized.includes('networkerror')
  )
}

export const createAlkemLaboratoriesScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_PAGE_URL)

    if (!hasOfficialCareersSignal(careersPage.html) || !hasOfficialHandoffSignal(careersPage.html)) {
      throw new Error('Alkem Laboratories careers page no longer exposes the verified careers handoff')
    }

    try {
      const handoffPage = await fetchPage(CAREERS_HANDOFF_URL)
      if (hasUnreachableCareersSignal(handoffPage)) {
        return maxJobs ? [].slice(0, maxJobs) : []
      }

      throw new Error('Alkem Laboratories careers host no longer matches the verified unreachable state')
    } catch (error) {
      if (isExpectedHandoffFailure(error)) {
        return maxJobs ? [].slice(0, maxJobs) : []
      }

      throw error
    }
  },
})

export const run = async () => createAlkemLaboratoriesScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'alkemlaboratories')
  }
}
