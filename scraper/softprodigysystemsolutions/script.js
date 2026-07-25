export const SOURCE = 'softprodigysystemsolutions'
export const COMPANY = 'SoftProdigy System Solutions'
export const HOMEPAGE_URL = 'https://softprodigy.com/'
export const KEKA_BOARD_URL = 'https://softprodigy.keka.com/careers/'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'SoftProdigy',
  adapter: 'script',
  modulePath: '../softprodigysystemsolutions/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: KEKA_BOARD_URL,
  atsPlatform: 'official-homepage-plus-keka-board',
  countryFilter: 'India',
  paginationStrategy: 'homepage-handoff-plus-single-keka-board-page',
  extractionStrategy: 'verified-homepage-keka-link+verified-keka-board-shell+same-board-job-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'softprodigy.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://softprodigy.com/ linked candidates to the public board at https://softprodigy.keka.com/careers/, and that the live Keka surface rendered the SoftProdigy System Solutions Pvt. Ltd. hiring shell with a Browse all jobs prompt.',
  dryRunFile: 'softprodigysystemsolutions/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /SoftProdigy \| AI/i.test(page) && /Digital Transformation, Engineered for Impact/i.test(page)
}

export const extractKekaBoardUrl = (html) => {
  const href = String(html ?? '').match(/href=["'](https:\/\/softprodigy\.keka\.com\/careers\/)["']/i)?.[1]
  return href ?? null
}

export const hasKekaBoardSignal = (html) => {
  const page = String(html ?? '')
  return /Browse all jobs/i.test(page)
    && /SoftProdigy System Solutions Pvt\. Ltd\./i.test(page)
    && /Powered by Keka/i.test(page)
}

export const extractJobCards = (html) => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<div class="job-card">([\s\S]*?)<\/div>/gi)) {
    const section = match[1]
    const title = normalizeWhitespace(section.match(/<a[^>]*>(.*?)<\/a>/i)?.[1])
    const href = section.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1]
    const spans = [...section.matchAll(/<span>(.*?)<\/span>/gi)].map((item) => normalizeWhitespace(item[1])).filter(Boolean)

    if (!title || !href || spans.length < 2) continue

    const sourceUrl = new URL(href, KEKA_BOARD_URL).toString()
    jobs.push({
      title,
      location: spans[0],
      employmentType: spans[1],
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return jobs
}

export const run = async ({ fetchText, now = () => new Date().toISOString() } = {}) => {
  const homepageHtml = await fetchText(HOMEPAGE_URL)

  if (!hasOfficialHomepageSignal(homepageHtml) || extractKekaBoardUrl(homepageHtml) !== KEKA_BOARD_URL) {
    throw new Error('SoftProdigy System Solutions verified homepage careers handoff changed materially')
  }

  const boardHtml = await fetchText(KEKA_BOARD_URL)
  if (!hasKekaBoardSignal(boardHtml)) {
    throw new Error('SoftProdigy System Solutions verified Keka board shell changed materially')
  }

  return extractJobCards(boardHtml).map((job) => ({
    ...job,
    company: COMPANY,
    country: 'India',
    link: job.applyUrl || job.sourceUrl,
    source: SOURCE,
    scrapedAt: now(),
  }))
}
