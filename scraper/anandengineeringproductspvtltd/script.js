import { fetchTextWithRetry } from '../utils/fetch.js'

export const CAREERS_PATHS = [
  '/',
  '/careers',
  '/careers/',
  '/jobs',
  '/jobs/',
]

export const OFFICIAL_SURFACE_CANDIDATES = [
  'https://anandengineeringproducts.com',
  'https://www.anandengineeringproducts.com',
  'https://anandengineeringproducts.in',
  'https://www.anandengineeringproducts.in',
  'https://anandengineeringproducts.co.in',
  'https://www.anandengineeringproducts.co.in',
  'https://anandenggproducts.com',
  'https://www.anandenggproducts.com',
  'https://aeppl.in',
  'https://www.aeppl.in',
]

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'anandengineeringproductspvtltd',
  attempts: 1,
  timeoutMs: 5000,
})

export const isExpectedMissingSurfaceError = (error) => {
  const parts = []
  let current = error
  const seen = new Set()

  while (current && !seen.has(current)) {
    seen.add(current)
    parts.push(current.message, current.code, current.hostname, current.name)
    current = current.cause
  }

  const message = parts.filter(Boolean).join(' ').toLowerCase()

  return message.includes('could not be resolved')
    || message.includes('enotfound')
    || message.includes('dns lookup failed')
    || message.includes('timed out')
    || message.includes('aborterror')
    || message.includes('und_err_connect_timeout')
    || message.includes('econnrefused')
}

const buildProbeUrls = () =>
  OFFICIAL_SURFACE_CANDIDATES.map((baseUrl) => new URL('/', `${baseUrl}/`).toString())

export const createAnandEngineeringProductsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    for (const url of buildProbeUrls()) {
      try {
        await fetchText(url)
        throw new Error(`Anand Engineering Products Pvt Ltd official first-party surface changed: ${url} now resolves publicly`)
      } catch (error) {
        if (isExpectedMissingSurfaceError(error)) {
          continue
        }

        throw new Error(`Anand Engineering Products Pvt Ltd official first-party surface changed: ${url} no longer matches the verified missing-surface checks`, {
          cause: error,
        })
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAnandEngineeringProductsScraper().run(options)
