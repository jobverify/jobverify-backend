import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kaleyra'
export const COMPANY = 'Kaleyra'
export const HOMEPAGE_URL = 'https://www.kaleyra.com/'
export const VERIFIED_HOME_URL = 'https://www.tatacommunications.com/kaleyra'
export const CAREERS_URL = 'https://jobs.tatacommunications.com/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeComparableUrl = (value) => {
  const input = String(value ?? '').trim()
  if (!input) return ''

  try {
    const url = new URL(input)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return input.replace(/\/$/, '')
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    headers: {
      location: response.headers.get('location'),
    },
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title[^>]*>\s*Tata Communications Kaleyra Transforming Total Experience\s*<\/title>/i.test(rawHtml)
    && new RegExp(
      `<link[^>]+rel=["']canonical["'][^>]+href=["']${VERIFIED_HOME_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
      'i',
    ).test(rawHtml)
    && new RegExp(
      `href=["']${CAREERS_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
      'i',
    ).test(rawHtml)
    && /Kaleyra\.io Login/i.test(normalized)
    && /Let's connect every conversation, from your teams to your customers/i.test(normalized)
}

export const hasVerifiedSharedCareersPortalSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title[^>]*>\s*Career Portal\s*<\/title>/i.test(rawHtml)
    && /jobs\.tatacommunications\.com/i.test(rawHtml)
    && /id=["']root["']/i.test(rawHtml)
    && /career-portal/i.test(rawHtml)
}

export const hasKaleyraSpecificJobsSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /\bKaleyra\b[\s\S]{0,80}\b(job|jobs|career|careers|opening|openings|role|roles)\b/i.test(normalized)
    || /href=["'][^"']*kaleyra[^"']*(job|jobs|career|careers|opening|openings|role|roles)[^"']*["']/i.test(rawHtml)
    || /\/jobs\/kaleyra[a-z0-9-]*/i.test(rawHtml)
}

export const createKaleyraScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Kaleyra verified official homepage no longer matches the known public surface')
    }

    if (normalizeComparableUrl(homepage.url) !== normalizeComparableUrl(VERIFIED_HOME_URL)) {
      throw new Error('Kaleyra homepage handoff no longer resolves to the verified Tata Communications Kaleyra surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (careersPage.status !== 200 || !hasVerifiedSharedCareersPortalSignal(careersPage.html)) {
      throw new Error('Kaleyra shared Tata careers portal no longer matches the verified public shell')
    }

    if (hasKaleyraSpecificJobsSignal(careersPage.html)) {
      throw new Error('Kaleyra shared careers portal changed materially or now exposes Kaleyra-specific public jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createKaleyraScraper().run(options)

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
