import { chromium } from 'playwright'

export const SOURCE = 'yellowmessenger'
export const COMPANY = 'Yellow Messenger'
export const OFFICIAL_BRAND = 'Yellow.ai'
export const CAREERS_URL = 'https://yellow.ai/career/'
export const EMBEDDED_ZOHO_SITE_URL = 'https://careers.yellow.ai'
export const DISPOSITION = 'verified-rebrand-careers-surface-plus-dead-zohorecruit-embed-return-empty'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Sunday, August 2, 2026 that Yellow Messenger still presents careers through the rebranded Yellow.ai surface at https://yellow.ai/career/, and that the rendered page still embeds Zoho Recruit via rec_embed_js.load with site:"https://careers.yellow.ai" and empty_job_msg:"No current Openings". On the verified date, the embedded public Zoho site resolved to a "does not exist" page and no visible public openings were rendered on the first-party careers page, so this scraper now validates the current embedded contract and returns no India jobs.'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const REQUIRED_SURFACE_PATTERNS = [
  /\bshape the future of conversations\b/i,
  /\blife at yellow\.ai\b/i,
  /\bthe yellow code\b/i,
  /\bexplore open positions\b/i,
  /\bchief executive officer and co-founder, yellow\.ai\b/i,
]

const decodeEntities = (value = '') =>
  String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeText = (value = '') =>
  normalizeWhitespace(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ) || ''

const buildChromiumLaunchArgs = () =>
  process.env.PUPPETEER_DISABLE_SANDBOX ? ['--no-sandbox'] : []

export const assertVerifiedOfficialRebrandSurface = (html = '') => {
  const text = normalizeText(html)

  if (REQUIRED_SURFACE_PATTERNS.every((pattern) => pattern.test(text))) return

  throw new Error(
    'Yellow Messenger verified official rebrand careers surface changed; review the Yellow.ai public contract before promoting a real parser.',
  )
}

export const assertVerifiedEmbeddedZohoLoader = (html = '') => {
  const page = String(html ?? '')

  const hasEmbedScript = /https:\/\/static\.zohocdn\.com\/recruit\/embed_careers_site\/javascript\/v1\.1\/embed_jobs\.js/i.test(page)
  const hasWidgetId = /widget_id\s*:\s*["']rec_job_listing_div["']/i.test(page)
  const hasPageName = /page_name\s*:\s*["']Careers["']/i.test(page)
  const hasSource = /source\s*:\s*["']CareerSite["']/i.test(page)
  const hasSite = new RegExp(`site\\s*:\\s*["']${EMBEDDED_ZOHO_SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i').test(page)
  const hasEmptyMessage = /empty_job_msg\s*:\s*["']No current Openings["']/i.test(page)

  if (hasEmbedScript && hasWidgetId && hasPageName && hasSource && hasSite && hasEmptyMessage) {
    return
  }

  throw new Error(
    'Yellow Messenger rendered careers surface no longer exposes the verified embedded Zoho loader contract.',
  )
}

const defaultLoadLiveCareersContract = async () => {
  const browser = await chromium.launch({
    headless: true,
    args: buildChromiumLaunchArgs(),
  })

  try {
    const page = await browser.newPage({ userAgent: USER_AGENT })

    await page.goto(CAREERS_URL, { waitUntil: 'networkidle', timeout: 60000 })
    const careersHtml = await page.content()

    return {
      careersHtml,
    }
  } finally {
    await browser.close()
  }
}

export const createYellowMessengerScraper = () => ({
  async run({
    loadLiveCareersContract = defaultLoadLiveCareersContract,
  } = {}) {
    const contract = await loadLiveCareersContract()

    assertVerifiedOfficialRebrandSurface(contract?.careersHtml || '')
    assertVerifiedEmbeddedZohoLoader(contract?.careersHtml || '')

    return []
  },
})

export const run = async (options = {}) => createYellowMessengerScraper().run(options)
