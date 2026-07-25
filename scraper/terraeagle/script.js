export const SOURCE = 'terraeagle'
export const COMPANY = 'Terraeagle'
export const HOMEPAGE_URL = 'https://terraeagle.com/'
export const ABOUT_URL = 'https://terraeagle.com/about-terraeagle/'
export const CAREERS_URL = 'https://terraeagle.com/careers/'
export const BROKEN_JOBS_URL = 'https://terraeagle.com/jobs/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bapply now\b/i,
  /\bjobposting\b/i,
  /\bjob posting\b/i,
  /\bawsm-job-listings\b/i,
  /\bwp-job-openings\b/i,
  /\bawsm-filter-item\b/i,
]

const NOT_FOUND_SIGNAL_PATTERNS = [
  /\b404\b/i,
  /\bpage not found\b/i,
  /\bnot found\b/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const isSameOfficialDomain = (value) => {
  try {
    return new URL(value || HOMEPAGE_URL).hostname === 'terraeagle.com'
  } catch {
    return false
  }
}

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

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('terraeagle')
    && normalized.includes('autonomous drone')
    && /href=["']https:\/\/terraeagle\.com\/jobs\/["']/i.test(page)
}

export const hasOfficialAboutSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('about terraeagle')
    && normalized.includes('leadership')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasVerifiedCareersShellSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('careers')
    && normalized.includes('terraeagle')
    && /\[awsmjobs\]/i.test(page)
    && !hasPublicJobsSignal(page)
  }

export const isVerifiedBrokenJobsRoute = (page = {}) => {
  if (!isSameOfficialDomain(page.url || BROKEN_JOBS_URL)) {
    return false
  }

  if (hasPublicJobsSignal(page.html)) {
    return false
  }

  if (Number(page.status) === 404) {
    return true
  }

  const normalized = normalizeWhitespace(page.html).toLowerCase()
  return NOT_FOUND_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized))
}

export const createTerraEagleScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Terraeagle verified official homepage no longer matches the expected company surface')
    }

    const about = await fetchPage(ABOUT_URL)
    if (about.status !== 200 || !hasOfficialAboutSignal(about.html)) {
      throw new Error('Terraeagle verified about page no longer matches the expected company surface')
    }

    const careers = await fetchPage(CAREERS_URL)
    if (careers.status !== 200 || !hasVerifiedCareersShellSignal(careers.html)) {
      throw new Error('Terraeagle verified careers shell changed materially or now exposes public jobs')
    }

    const brokenJobsRoute = await fetchPage(BROKEN_JOBS_URL)
    if (!isVerifiedBrokenJobsRoute(brokenJobsRoute)) {
      throw new Error('Terraeagle broken jobs route no longer matches the verified no-public-jobs surface')
    }

    return []
  },
})

export const run = async (options = {}) => createTerraEagleScraper().run(options)
