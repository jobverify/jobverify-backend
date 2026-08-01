import { chromium } from 'playwright'

export const SOURCE = 'yellowmessenger'
export const COMPANY = 'Yellow Messenger'
export const OFFICIAL_BRAND = 'Yellow.ai'
export const CAREERS_URL = 'https://yellow.ai/career/'
export const ZOHO_PORTAL_URL = 'https://yellow.zohorecruit.in/jobs/Careers'
export const ZOHO_API_URL =
  'https://yellow.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite'
export const DISPOSITION = 'verified-rebrand-careers-surface-plus-public-zohorecruit-board'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Sunday, July 26, 2026 that Yellow Messenger now presents careers through the rebranded Yellow.ai surface at https://yellow.ai/career/, that the rendered public page exposed the official Zoho Recruit board at https://yellow.zohorecruit.in/jobs/Careers, and that the public Zoho payload returned one India role, GTM recruiter, marked Position filled with Publish false and Is_Locked true. This scraper validates the rendered first-party careers surface plus the public Zoho Recruit contract and returns only published India jobs when they are publicly available.'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const REQUIRED_SURFACE_PATTERNS = [
  /\bshape the future of conversations\b/i,
  /\blife at yellow\.ai\b/i,
  /\bthe yellow code\b/i,
  /\bexplore open positions\b/i,
  /\bchief executive officer and co-founder, yellow\.ai\b/i,
]

const REQUIRED_ZOHO_PORTAL_PATTERNS = [
  /\bfind the career of your dreams\b/i,
  /\bcurrent openings\b/i,
  /\bpowered by\b/i,
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

const stripTags = (value = '') =>
  normalizeWhitespace(
    String(value)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(div|p|li|ul|ol|h[1-6])>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, ' '),
  )

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (/intern/.test(normalized)) return 'Internship'
  if (/contract|consultant/.test(normalized)) return 'Contract'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/full.?time/.test(normalized)) return 'Full-time'
  return normalizeWhitespace(value)
}

const buildLocation = ({ city, state, country }) => {
  const parts = [normalizeWhitespace(city), normalizeWhitespace(state), normalizeWhitespace(country)]
    .filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : null
}

const isIndiaJob = (record = {}) => /india/i.test(normalizeWhitespace(record.Country) || '')

const isPublishedJob = (record = {}) =>
  record.Publish !== false && record.Is_Locked !== true && record.Keep_on_Career_Site !== false

const buildChromiumLaunchArgs = () =>
  process.env.PUPPETEER_DISABLE_SANDBOX ? ['--no-sandbox'] : []

export const extractIndiaJobs = (payload = {}) => (Array.isArray(payload?.data) ? payload.data : [])
  .filter((record) => isIndiaJob(record) && isPublishedJob(record))
  .map((record) => {
    const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
    const city = normalizeWhitespace(record.City)
    const state = normalizeWhitespace(record.State)
    const country = normalizeWhitespace(record.Country)
    const jobId = normalizeWhitespace(record.id)
    const sourceUrl = normalizeWhitespace(record.$url)
    const location = buildLocation({ city, state, country })

    if (!title || !country || !jobId || !sourceUrl || !location) return null

    return {
      title,
      company: COMPANY,
      department: null,
      location,
      city,
      state,
      country,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(record.Job_Type),
      experienceRequired: normalizeWhitespace(record.Work_Experience),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(record.Date_Opened),
      closingDate: null,
      jobDescription: stripTags(record.Job_Description),
      remoteStatus: record.Remote_Job ? 'Remote' : 'On-site',
    }
  })
  .filter(Boolean)

export const assertVerifiedOfficialRebrandSurface = (html = '') => {
  const text = normalizeText(html)

  if (REQUIRED_SURFACE_PATTERNS.every((pattern) => pattern.test(text))) return

  throw new Error(
    'Yellow Messenger verified official rebrand careers surface changed; review the Yellow.ai public contract before promoting a real parser.',
  )
}

export const assertVerifiedZohoBoardSurface = (
  boardText = '',
  boardUrl = ZOHO_PORTAL_URL,
) => {
  const text = normalizeText(boardText)

  if (
    boardUrl === ZOHO_PORTAL_URL
    && REQUIRED_ZOHO_PORTAL_PATTERNS.every((pattern) => pattern.test(text))
  ) {
    return
  }

  throw new Error(
    'Yellow Messenger verified Zoho Recruit board changed; review the public Yellow.ai careers contract.',
  )
}

export const assertVerifiedZohoPayload = (payload = {}) => {
  if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
    throw new Error(
      'Yellow Messenger public Zoho Recruit payload no longer returns the verified success contract.',
    )
  }

  if (payload.data.length === 0) return

  const hasExactCompanySignal = payload.data.some((record) =>
    /https:\/\/yellow\.zohorecruit\.in\/jobs\/Careers\//i.test(normalizeWhitespace(record?.$url) || '')
      && /\babout yellow\.ai\b/i.test(normalizeText(record?.Job_Description || '')),
  )

  if (hasExactCompanySignal) return

  throw new Error(
    'Yellow Messenger public Zoho Recruit payload changed; review the public Yellow.ai careers contract.',
  )
}

const defaultLoadLiveCareersContract = async () => {
  const browser = await chromium.launch({
    headless: true,
    args: buildChromiumLaunchArgs(),
  })

  try {
    const page = await browser.newPage({ userAgent: USER_AGENT })

    // Yellow.ai renders the Zoho board handoff client-side, so static fetches miss the live contract.
    await page.goto(CAREERS_URL, { waitUntil: 'networkidle', timeout: 60000 })
    const careersHtml = await page.content()
    const boardLinks = await page.locator('a').evaluateAll(
      (nodes, portalUrl) =>
        nodes
          .map((node) => node.href)
          .filter((href) => typeof href === 'string' && href.startsWith(`${portalUrl}/`)),
      ZOHO_PORTAL_URL,
    )

    if (boardLinks.length === 0) {
      throw new Error(
        'Yellow Messenger rendered careers surface no longer exposes the verified Zoho Recruit board handoff.',
      )
    }

    await page.goto(ZOHO_PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const boardText = await page.locator('body').innerText()
    const payloadResult = await page.evaluate(async (apiUrl) => {
      const response = await fetch(apiUrl, {
        headers: {
          Accept: 'application/json,text/plain,*/*',
        },
      })

      const text = await response.text()
      let body = null

      try {
        body = JSON.parse(text)
      } catch {
        body = null
      }

      return {
        status: response.status,
        body,
      }
    }, ZOHO_API_URL)

    if (payloadResult.status !== 200 || payloadResult.body == null) {
      throw new Error(`HTTP ${payloadResult.status} for ${ZOHO_API_URL}`)
    }

    return {
      careersHtml,
      boardUrl: ZOHO_PORTAL_URL,
      boardText,
      payload: payloadResult.body,
    }
  } finally {
    await browser.close()
  }
}

export const createYellowMessengerScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    loadLiveCareersContract = defaultLoadLiveCareersContract,
    now: overrideNow,
  } = {}) {
    const contract = await loadLiveCareersContract()

    assertVerifiedOfficialRebrandSurface(contract?.careersHtml || '')
    assertVerifiedZohoBoardSurface(contract?.boardText || '', contract?.boardUrl || ZOHO_PORTAL_URL)
    assertVerifiedZohoPayload(contract?.payload)

    return extractIndiaJobs(contract?.payload).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createYellowMessengerScraper().run(options)
