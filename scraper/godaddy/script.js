import { fetchTextWithRetry } from '../utils/fetch.js'

const SEARCH_URL = 'https://careers.godaddy/jobs/search?query=&location=India'
const BROWSER_SEARCH_URL = 'https://careers.godaddy/jobs/search/india'
const BASE_URL = 'https://careers.godaddy'
const EMPTY_RESULTS_PATTERN = /\b(?:no jobs?|no results?|0 jobs?)\b|\bdisplaying\s+all\s+0\s+entries\b/i

const stripTags = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .trim()

const match = (value, pattern) => value.match(pattern)?.[1] || null

export const extractGoDaddySearchResults = (html = '') => {
  const cards = String(html).match(
    /<article\b[^>]*class=["'][^"']*job-search-results-card[^"']*["'][^>]*>[\s\S]*?<\/article>/gi,
  ) || []

  return cards.map((card) => {
    const titleBlock = match(
      card,
      /<h[23]\b[^>]*class=["'][^"']*job-search-results-card-title[^"']*["'][^>]*>([\s\S]*?)<\/h[23]>/i,
    ) || match(card, /<a\b[^>]*href=["'][^"']+["'][^>]*>\s*<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
    const href = match(card, /<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/i)
    const title = stripTags(titleBlock)
    const requisitionId = stripTags(
      match(card, /<span\b[^>]*(?:id=["'][^"']*requisition_identifier[^"']*["']|class=["'][^"']*job-id[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i),
    ) || null
    const location = stripTags(
      match(card, /<span\b[^>]*(?:id=["'][^"']*location_icon_text[^"']*["']|class=["'][^"']*\blocation\b[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i),
    )
    const department = stripTags(
      match(card, /<span\b[^>]*(?:id=["'][^"']*department_icon_text[^"']*["']|class=["'][^"']*department[^"']*["'])[^>]*>([\s\S]*?)<\/span>/i),
    ) || null
    const description = stripTags(
      match(card, /<p\b[^>]*class=["'][^"']*job-search-results-summary[^"']*["'][^>]*>([\s\S]*?)<\/p>/i),
    ) || null

    if (!title || !href || !/\bindia\b/i.test(location)) return null
    return {
      title,
      sourceUrl: new URL(href, BASE_URL).toString(),
      location,
      jobId: requisitionId,
      department,
      description,
    }
  }).filter(Boolean)
}

const isExplicitEmptyPage = (html) => EMPTY_RESULTS_PATTERN.test(stripTags(html))

export const renderGoDaddySearchPage = async (url = BROWSER_SEARCH_URL) => {
  const { launchBrowser, createOptimizedPage } = await import('../utils/browser.js')
  let browser
  let lastError = null
  let lastStatus = null

  try {
    browser = await launchBrowser()
    const page = await createOptimizedPage(browser)

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 60000,
        })
        lastStatus = response?.status() || null

        let html = await page.content()
        if (extractGoDaddySearchResults(html).length > 0 || isExplicitEmptyPage(html)) {
          return html
        }

        try {
          await page.waitForSelector('article.job-search-results-card', { timeout: 30000 })
        } catch {
          // The AWS WAF reload and Turbo rendering are timing-sensitive. The
          // serialized HTML below is the authoritative success condition.
        }

        html = await page.content()
        if (extractGoDaddySearchResults(html).length > 0 || isExplicitEmptyPage(html)) {
          return html
        }
      } catch (error) {
        lastError = error
      }
    }
  } finally {
    if (browser) await browser.close()
  }

  const status = lastStatus == null ? '' : ` (last HTTP status ${lastStatus})`
  const reason = lastError?.message ? `: ${lastError.message}` : ''
  throw new Error(`[godaddy] browser fallback did not return a recognizable India search page${status}${reason}`)
}

export const createGoDaddyScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({
    fetchText = (url) => fetchTextWithRetry(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
      },
      label: 'godaddy',
      timeoutMs: 25000,
    }),
    renderSearchPage = renderGoDaddySearchPage,
  } = {}) {
    let html
    let usedBrowserFallback = false
    try {
      html = await fetchText(SEARCH_URL)
    } catch {
      usedBrowserFallback = true
      html = await renderSearchPage(BROWSER_SEARCH_URL)
    }

    let jobs = extractGoDaddySearchResults(html)
    if (jobs.length === 0 && !isExplicitEmptyPage(html) && !usedBrowserFallback) {
      usedBrowserFallback = true
      html = await renderSearchPage(BROWSER_SEARCH_URL)
      jobs = extractGoDaddySearchResults(html)
    }

    if (jobs.length === 0 && !isExplicitEmptyPage(html)) {
      throw new Error('[godaddy] official search page did not contain recognizable India job cards')
    }

    const seen = new Set()
    return jobs.filter((job) => {
      const identity = String(job.jobId || job.sourceUrl)
      if (seen.has(identity)) return false
      seen.add(identity)
      return true
    }).map((job) => ({
      title: job.title,
      company: 'GoDaddy',
      location: job.location,
      city: (() => {
        const candidate = job.location.split(',')[0]?.trim()
        return candidate && !/^(?:india|remote)$/i.test(candidate) ? candidate : null
      })(),
      country: 'India',
      link: job.sourceUrl,
      sourceUrl: job.sourceUrl,
      applyUrl: job.sourceUrl,
      jobId: job.jobId,
      requisitionId: job.jobId,
      department: job.department,
      employmentType: null,
      remoteStatus: /hybrid/i.test(`${job.location} ${job.description}`)
        ? 'Hybrid'
        : (/remote/i.test(`${job.location} ${job.description}`) ? 'Remote' : null),
      jobDescription: job.description,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      source: 'godaddy',
      scrapedAt: now(),
    }))
  },
})

export const run = (options = {}) => createGoDaddyScraper().run(options)
