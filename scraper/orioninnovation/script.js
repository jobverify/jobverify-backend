import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT_MS = 15000

export const SOURCE = 'orioninnovation'
export const COMPANY = 'Orion Innovation'
export const CAREERS_PAGE_URL = 'https://www.orioninnovation.com/careers/life-at-orion/'
export const OPEN_JOBS_URL = 'https://www.orioninnovation.com/careers/job/'
export const VERIFIED_ON = '2026-08-14'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasVerifiedCloudflareChallengeSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(page)
    && normalized.includes('Enable JavaScript and cookies to continue')
    && /challenges\.cloudflare\.com/i.test(page)
    && /orioninnovation\.com/i.test(page)
    && /_cf_chl_opt/i.test(page)
}

export const exposesStructuredPublicJobs = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /gh_jid=/i.test(page)
    || /\bOpen Jobs\b/i.test(normalized)
    || /\bOpen Positions\b/i.test(normalized)
    || /\bLoad more\b/i.test(normalized)
    || /\bExplore Opportunities\b/i.test(normalized)
    || /\bWhere people grow and innovation thrives\b/i.test(normalized)
}

const buildMaterialSurfaceChangeError = () => {
  const error = new Error('Orion Innovation verified blocked careers surfaces changed materially')
  error.abortRetries = true
  return error
}

const defaultFetchPage = async (url) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    return {
      status: response.status,
      url,
      finalUrl: response.url,
      html: await response.text(),
      errorKind: null,
    }
  } catch (error) {
    clearTimeout(timeout)

    return {
      status: null,
      url,
      finalUrl: url,
      html: null,
      errorKind: error?.name === 'AbortError' ? 'timeout' : 'network',
      errorMessage: String(error?.message ?? error),
    }
  }
}

export const createOrionInnovationScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    for (const url of [CAREERS_PAGE_URL, OPEN_JOBS_URL]) {
      const page = await fetchPage(url)

      if (page.errorKind) {
        throw new Error(`Failed to fetch verified Orion Innovation route: ${url} (${page.errorKind})`)
      }

      if (exposesStructuredPublicJobs(page.html)) {
        throw new Error('Orion Innovation careers page now exposes scraper-visible public jobs')
      }

      if (Number(page.status) !== 403 || !hasVerifiedCloudflareChallengeSignal(page.html)) {
        throw buildMaterialSurfaceChangeError()
      }
    }

    return []
  },
})

export const run = async (options = {}) => createOrionInnovationScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
