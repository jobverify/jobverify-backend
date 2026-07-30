import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { HEX_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = HEX_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const SAMPLE_ROLE_URLS = PROVIDER_METADATA.sampleRoleUrls

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;|â€™/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;|â€“|â€”/gi, '-')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<\/(p|div|li|ul|ol|h[1-6]|section|article|a|footer|main|nav)>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasVerifiedCareersLandingSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /Careers at Hex/i.test(normalized)
    && /Make everyone a data person/i.test(normalized)
    && /It's just "Hex"!/i.test(normalized)
    && /We're hiring in San Francisco, New York, and remote\./i.test(normalized)
}

export const hasUsOnlyRolePageSignal = (html = '', roleTitle = '') => {
  const normalizedRoleTitle = String(roleTitle ?? '').trim()
  const normalized = normalizeWhitespace(html)

  return Boolean(normalizedRoleTitle)
    && normalized.includes(normalizedRoleTitle)
    && /\b(Open Role|About the role)\b/i.test(normalized)
    && /Remote \(US\)/i.test(normalized)
}

export const createHexScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersLandingSignal(careersHtml)) {
      throw new Error('Hex verified careers page no longer matches the known fail-closed contract')
    }

    const expectedRoles = [
      'Software Engineer, Backend (Platform)',
      'Cloud Security Engineer',
    ]

    for (const [index, sampleRoleUrl] of SAMPLE_ROLE_URLS.entries()) {
      const roleHtml = await fetchText(sampleRoleUrl)
      if (!hasUsOnlyRolePageSignal(roleHtml, expectedRoles[index])) {
        throw new Error(`Hex verified role page no longer matches the known fail-closed contract: ${sampleRoleUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createHexScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
