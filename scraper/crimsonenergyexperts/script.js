import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'crimsonenergyexperts'
export const COMPANY = 'Crimson Energy Experts Pvt Ltd'
export const HOMEPAGE_URL = 'https://crimsonenergy.in/'
export const CAREERS_URL = 'https://crimsonenergy.in/careers.html'
export const SITEMAP_URL = 'https://crimsonenergy.in/sitemap.xml'
export const MISSING_ROUTE_URLS = [
  'https://crimsonenergy.in/career',
  'https://crimsonenergy.in/jobs',
  'https://crimsonenergy.in/join-us',
  'https://crimsonenergy.in/current-openings',
  'https://crimsonenergy.in/openings',
]

export const EXPECTED_ROLE_APPLY_URLS = {
  'Artificial Intelligence (AI) & Machine Learning': 'https://forms.gle/VUiYLf88LjmD7Yzu7',
  Engineering: 'https://forms.gle/vSaNLFnoWJRb1SDX6',
  'Software Engineering': 'https://forms.gle/Z9THYAeU2FEvCPm39',
  Finance: 'https://forms.gle/snCnLta42UzacbCSA',
}

export const RESUME_SUBMISSION_URL = 'https://forms.gle/daGJArL9eL8km5ZN8'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;|&mdash;|&#8212;/gi, '-')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => String(value ?? '')
  .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<(p|div|section|article|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const normalizeVisibleText = (value) => normalizeWhitespace(stripTags(value)) || ''

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeVisibleText(page).toLowerCase()
  const lowerPage = page.toLowerCase()

  return /<title>\s*Crimson Energy\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/crimsonenergy\.in\/?["']/i.test(page)
    && text.includes('crimson energy experts pvt ltd')
    && lowerPage.includes('crimson energy specializes in delivering innovative, tailor-made solutions across a broad spectrum of industries')
    && text.includes('trusted partner of the indian navy, barc and drdo')
    && /href=["']\/careers\.html["']/i.test(page)
}

export const hasVerifiedCareersLink = (html) =>
  /href=["']\/careers\.html["']/i.test(String(html ?? ''))

export const hasOfficialSitemapSignal = (xml) => {
  const sitemap = String(xml ?? '')

  return /<loc>https:\/\/crimsonenergy\.in\/<\/loc>/i.test(sitemap)
    && /<loc>https:\/\/crimsonenergy\.in\/careers\.html<\/loc>/i.test(sitemap)
    && /<loc>https:\/\/crimsonenergy\.in\/contact\.html<\/loc>/i.test(sitemap)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeVisibleText(page).toLowerCase()

  return /<title>\s*Careers - Crimson Energy\s*<\/title>/i.test(page)
    && text.includes("we're hiring.")
    && text.includes('advance with us')
    && text.includes('opportunities at crimson')
    && text.includes('we welcome top talent to join crimson, where we value excellence and create meaningful impact')
    && text.includes('don’t see a role that fits')
    && page.includes(RESUME_SUBMISSION_URL)
    && /mailto:info@crimsonenergy\.in/i.test(page)
    && /linkedin\.com\/company\/crimson-energy-experts-pvt-ltd/i.test(page)
    && /CIN:\s*U74900PN2012PTC143507/i.test(page)
}

export const isVerifiedMissingRoute = ({ status, html }) => {
  const page = String(html ?? '')
  const text = normalizeVisibleText(page).toLowerCase()

  return status === 404
    && /<title>\s*This Page Does Not Exist\s*<\/title>/i.test(page)
    && text.includes('this page does not exist')
    && text.includes("sorry, the page you are looking for could not be found")
    && !/apply now/i.test(page)
  }

const extractLastMatch = (html, pattern) => {
  const matches = [...String(html ?? '').matchAll(pattern)]
  return matches.at(-1)?.[1] ?? null
}

const getApplyCardContexts = (html) => {
  const page = String(html ?? '')
  const anchors = [
    ...page.matchAll(
      /<a\b[^>]*href=["'](https:\/\/forms\.gle\/[^"']+)["'][^>]*>\s*<button[\s\S]*?<label[^>]*>\s*Apply Now\s*<\/label>/gi,
    ),
  ]

  return anchors.map((anchor, index) => {
    const previousEnd = index === 0
      ? 0
      : (anchors[index - 1].index ?? 0) + anchors[index - 1][0].length

    return {
      context: page.slice(previousEnd, anchor.index),
      applyUrl: anchor[1],
    }
  })
}

export const extractRoleCards = (html) => getApplyCardContexts(html)
  .map(({ context, applyUrl }) => {
    const title = normalizeWhitespace(extractLastMatch(context, /<h3\b[^>]*>([\s\S]*?)<\/h3>/gi))
    const description = normalizeWhitespace(extractLastMatch(context, /<p\b[^>]*>([\s\S]*?)<\/p>/gi))

    if (!title || !description || !applyUrl) return null

    return {
      title,
      description,
      applyUrl,
    }
  })
  .filter(Boolean)

export const extractJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Crimson Energy Experts verified careers page no longer matches the known first-party jobs surface')
  }

  const roleCards = extractRoleCards(html)
  const expectedTitles = Object.keys(EXPECTED_ROLE_APPLY_URLS)

  if (roleCards.length !== expectedTitles.length) {
    throw new Error('Crimson Energy Experts public role cards changed materially')
  }

  const seenTitles = new Set()

  const jobs = roleCards.map((roleCard) => {
    const expectedApplyUrl = EXPECTED_ROLE_APPLY_URLS[roleCard.title]

    if (!expectedApplyUrl || expectedApplyUrl !== roleCard.applyUrl) {
      throw new Error(`Crimson Energy Experts role mapping drifted for "${roleCard.title}"`)
    }

    if (seenTitles.has(roleCard.title)) {
      throw new Error(`Crimson Energy Experts role cards duplicated "${roleCard.title}"`)
    }
    seenTitles.add(roleCard.title)

    const jobId = `${SOURCE}-${slugify(roleCard.title)}`
    if (!jobId) {
      throw new Error(`Crimson Energy Experts role could not be normalized: "${roleCard.title}"`)
    }

    return {
      title: roleCard.title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId,
      requisitionId: null,
      sourceUrl: CAREERS_URL,
      applyUrl: roleCard.applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: roleCard.description,
    }
  })

  for (const expectedTitle of expectedTitles) {
    if (!seenTitles.has(expectedTitle)) {
      throw new Error(`Crimson Energy Experts missing verified role "${expectedTitle}"`)
    }
  }

  return jobs
}

export const createCrimsonEnergyExpertsScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchPage = defaultFetchPage, now: overrideNow } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Crimson Energy Experts verified homepage no longer matches the known first-party surface')
    }

    if (!hasVerifiedCareersLink(homepage.html)) {
      throw new Error('Crimson Energy Experts homepage no longer links to the verified careers route')
    }

    const sitemap = await fetchPage(SITEMAP_URL)
    if (sitemap.status !== 200 || !hasOfficialSitemapSignal(sitemap.html)) {
      throw new Error('Crimson Energy Experts sitemap no longer advertises the verified careers surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Crimson Energy Experts verified careers page no longer matches the known first-party jobs surface')
    }

    for (const missingRouteUrl of MISSING_ROUTE_URLS) {
      const missingRoute = await fetchPage(missingRouteUrl)

      if (!isVerifiedMissingRoute(missingRoute)) {
        throw new Error(`Crimson Energy Experts missing-route validation failed for ${missingRouteUrl}`)
      }
    }

    const jobs = extractJobs(careersPage.html)
    const scrapedAt = (overrideNow || now)()

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt,
      companyCareerPage: CAREERS_URL,
      companyDomain: 'crimsonenergy.in',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createCrimsonEnergyExpertsScraper().run(options)

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
