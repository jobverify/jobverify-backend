export const SOURCE = 'shopconnect'
export const COMPANY = 'Shopconnect'
export const HOMEPAGE_URL = 'https://www.shopconnect.in/'
export const SITEMAP_URL = 'https://www.shopconnect.in/sitemap.xml'
export const PAGE_SITEMAP_URL = 'https://www.shopconnect.in/wp-sitemap-posts-page-1.xml'
export const WORDPRESS_SEARCH_URLS = [
  'https://www.shopconnect.in/wp-json/wp/v2/pages?search=career&per_page=50',
  'https://www.shopconnect.in/wp-json/wp/v2/posts?search=career&per_page=50',
  'https://www.shopconnect.in/wp-json/wp/v2/pages?search=job&per_page=50',
  'https://www.shopconnect.in/wp-json/wp/v2/posts?search=job&per_page=50',
]
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'https://www.shopconnect.in/careers',
  'https://www.shopconnect.in/careers/',
  'https://www.shopconnect.in/career',
  'https://www.shopconnect.in/career/',
  'https://www.shopconnect.in/jobs',
  'https://www.shopconnect.in/jobs/',
  'https://www.shopconnect.in/job',
  'https://www.shopconnect.in/job/',
  'https://www.shopconnect.in/join-us',
  'https://www.shopconnect.in/join-us/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREER_PATH_PATTERN =
  /(?:^|\/)(career|careers|job|jobs|opening|openings|vacancy|vacancies|join-us|joinus|work-with-us)(?:\/|$)/i

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bjob description\b/i,
  /\bapply now\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /zohorecruit/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return /<title>\s*Shopconnect\s*<\/title>/i.test(rawHtml)
    && normalized.includes('shopconnect')
    && normalized.includes('amazon associates')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const sitemapPointsToVerifiedPageSitemap = (xml) =>
  new RegExp(`<loc>\\s*${PAGE_SITEMAP_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<\\/loc>`, 'i')
    .test(String(xml ?? ''))

export const sitemapHasCareerLikeUrl = (xml) => {
  const matches = String(xml ?? '').match(/<loc>([^<]+)<\/loc>/gi) || []

  return matches.some((entry) => {
    const location = entry.replace(/^<loc>|<\/loc>$/gi, '')
    return CAREER_PATH_PATTERN.test(location)
  })
}

export const isVerifiedEmptyWordPressSearchResult = (html) => {
  try {
    const parsed = JSON.parse(String(html ?? '').trim())
    return Array.isArray(parsed) && parsed.length === 0
  } catch {
    return false
  }
}

export const isVerifiedMissingCareerRoute = (page = {}) =>
  Number(page?.status) === 404
  && /<title>\s*Page not found\s*-\s*Shopconnect\s*<\/title>/i.test(String(page?.html ?? ''))
  && !hasPublicJobsSignal(page?.html)

export const createShopconnectScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Shopconnect verified official homepage no longer matches the known public surface')
    }
    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Shopconnect homepage now appears to expose a public jobs surface')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (sitemap.status !== 200 || !sitemapPointsToVerifiedPageSitemap(sitemap.html)) {
      throw new Error('Shopconnect verified sitemap chain no longer matches the known public surface')
    }

    const pageSitemap = await fetchPage(PAGE_SITEMAP_URL)
    if (pageSitemap.status !== 200 || sitemapHasCareerLikeUrl(pageSitemap.html)) {
      throw new Error('Shopconnect verified sitemap no longer matches the no-public-careers surface')
    }

    for (const searchUrl of WORDPRESS_SEARCH_URLS) {
      const searchResponse = await fetchPage(searchUrl)
      if (searchResponse.status !== 200 || !isVerifiedEmptyWordPressSearchResult(searchResponse.html)) {
        throw new Error('Shopconnect verified WordPress search surface no longer matches the empty no-public-careers state')
      }
    }

    for (const routeUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isVerifiedMissingCareerRoute(routePage)) {
        throw new Error(`Shopconnect verified no-public-careers route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createShopconnectScraper().run(options)
