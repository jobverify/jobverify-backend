import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://www.uptiq.ai/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const OFFICIAL_BRAND_PATTERN = /<title>\s*Careers at Uptiq\s*\|\s*Join AI in Financial Services\s*<\/title>/i
const CAREERS_PAGE_PATTERN = /Careers at Uptiq/i
const ROLE_FAMILY_PATTERN = /View Open Roles/i
const CAREER_FORM_PATTERN = /id=["']wf-form-Career-Form["']/i
const PUBLIC_JOB_BOARD_PATTERN =
  /jobs\.lever\.co|boards\.greenhouse\.io|ashbyhq\.com|workable\.com|smartrecruiters|job-boards\.greenhouse\.io|myworkdayjobs|job openings\/search|\/jobs\/[a-z0-9-]+/i

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return OFFICIAL_BRAND_PATTERN.test(page)
    && CAREERS_PAGE_PATTERN.test(page)
    && ROLE_FAMILY_PATTERN.test(page)
    && CAREER_FORM_PATTERN.test(page)
}

export const hasPublicJobBoardSignal = (html) => PUBLIC_JOB_BOARD_PATTERN.test(String(html ?? ''))

export const extractSearchResults = () => []

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'uptiqai',
  timeoutMs: 15000,
})

export const createUptiqAiScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(html)) {
      throw new Error('Uptiq.ai careers page no longer matches the verified email-apply public surface')
    }

    if (hasPublicJobBoardSignal(html)) {
      throw new Error('Uptiq.ai careers page now appears to expose a public job board')
    }

    return extractSearchResults(html)
  },
})

export const run = async (options = {}) => createUptiqAiScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'uptiqai')
  }
}
