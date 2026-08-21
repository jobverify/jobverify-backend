import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lifesigns'
export const COMPANY = 'LifeSigns'
export const HOMEPAGE_URL = 'https://www.lifesigns.us/'
export const CAREERS_URL = 'https://www.lifesigns.us/careers/'
export const EXPECTED_ROLE_CARDS = {
  '/careers/junior-video-editor/': {
    title: 'Junior Video Editor',
    employmentType: 'Full-Time',
    city: 'Chennai',
  },
  '/careers/junior-visual-designer/': {
    title: 'Junior Visual Designer',
    employmentType: 'Full-Time',
    city: 'Chennai',
  },
  '/careers/digital-patient-monitoring-executive-cmt/': {
    title: 'Digital Patient Monitoring Executive (Central Monitoring Executive)',
    employmentType: 'Full-Time',
    city: 'Chennai',
  },
  '/careers/hospital-support-executive-hse/': {
    title: 'Hospital Support Executive (HSE)',
    employmentType: 'Full-Time',
    city: 'Surat',
  },
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': USER_AGENT,
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const normalizePathname = (value, baseUrl = CAREERS_URL) => {
  try {
    const url = new URL(value, baseUrl)
    return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
  } catch {
    return null
  }
}

const hasPathLink = (snapshot, pathname) => (Array.isArray(snapshot?.links) ? snapshot.links : [])
  .some((href) => normalizePathname(href, snapshot?.url || HOMEPAGE_URL) === pathname)

const buildJobId = (pathname) => {
  const slug = normalizePathname(pathname)
    ?.split('/')
    .filter(Boolean)
    .at(-1)

  return slug ? `${SOURCE}-${slug}` : null
}

const buildRoleUrl = (pathname) => {
  try {
    return new URL(normalizePathname(pathname) || '', HOMEPAGE_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

const stripHtml = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')

const extractHtmlTitle = (html = '') =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const extractSnapshotLinks = (html = '') => [...String(html ?? '').matchAll(
  /<a\b[^>]*href=(["'])(.*?)\1[^>]*>/gi,
)]
  .map((match) => normalizeWhitespace(match[2]))
  .filter(Boolean)

const defaultFetchPageSnapshot = async (url) => {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  })
  const finalUrl = response.url || url
  const html = await response.text()

  return {
    status: response.status,
    url: finalUrl,
    title: extractHtmlTitle(html),
    text: normalizeWhitespace(stripHtml(html)),
    links: extractSnapshotLinks(html),
  }
}

export const hasOfficialHomepageSignal = (snapshot = {}) => {
  const title = normalizeWhitespace(snapshot.title) || ''
  const text = (normalizeWhitespace(snapshot.text) || '').toLowerCase()

  return snapshot.status === 200
    && normalizePathname(snapshot.url, HOMEPAGE_URL) === '/'
    && title === 'Lifesigns | Intelligent patient monitoring for smarter decisions'
    && text.includes('ai-powered patient monitoring')
    && text.includes('predictive intelligence and continuous monitoring')
    && hasPathLink(snapshot, '/careers/')
}

export const hasOfficialCareersSignal = (snapshot = {}) => {
  const title = normalizeWhitespace(snapshot.title) || ''
  const text = normalizeWhitespace(snapshot.text) || ''
  const normalizedText = text.toLowerCase()

  return snapshot.status === 200
    && normalizePathname(snapshot.url, CAREERS_URL) === '/careers/'
    && title === 'Careers at Lifesigns | Challenge convention'
    && normalizedText.includes('we challenge')
    && normalizedText.includes('see open roles')
    && normalizedText.includes('explore our open roles')
    && normalizedText.includes("didn't see the role you're looking for?")
    && normalizedText.includes('leave a message')
}

export const hasVerifiedRoleDetailSignal = (snapshot = {}, pathname, expected = EXPECTED_ROLE_CARDS[pathname]) => {
  if (!expected) {
    return false
  }

  const title = normalizeWhitespace(snapshot.title) || ''

  return snapshot.status === 200
    && normalizePathname(snapshot.url, CAREERS_URL) === pathname
    && title === expected.title
}

export const extractVerifiedOpenRoles = (careersSnapshot, roleSnapshotsByPath = {}) => {
  if (!hasOfficialCareersSignal(careersSnapshot)) {
    throw new Error('LifeSigns careers page no longer matches the verified official public surface')
  }

  return Object.entries(EXPECTED_ROLE_CARDS).map(([pathname, expected]) => {
    const roleSnapshot = roleSnapshotsByPath[pathname]
    const jobId = buildJobId(pathname)
    const roleUrl = buildRoleUrl(pathname)

    if (!hasVerifiedRoleDetailSignal(roleSnapshot, pathname, expected)) {
      throw new Error(`LifeSigns role detail page drifted for "${pathname}"`)
    }

    if (!jobId) {
      throw new Error(`LifeSigns missing verified opening "${pathname}"`)
    }

    return {
      title: expected.title,
      company: COMPANY,
      department: null,
      location: `${expected.city}, India`,
      city: expected.city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: roleUrl,
      applyUrl: roleUrl,
      employmentType: expected.employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  })
}

export const createLifeSignsScraper = () => ({
  async run({ fetchPageSnapshot = defaultFetchPageSnapshot } = {}) {
    const homepageSnapshot = await fetchPageSnapshot(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageSnapshot)) {
      throw new Error('LifeSigns homepage no longer matches the verified official public surface')
    }

    const careersSnapshot = await fetchPageSnapshot(CAREERS_URL)
    const roleSnapshots = Object.fromEntries(
      await Promise.all(
        Object.keys(EXPECTED_ROLE_CARDS).map(async (pathname) => [pathname, await fetchPageSnapshot(buildRoleUrl(pathname))]),
      ),
    )
    const jobs = extractVerifiedOpenRoles(careersSnapshot, roleSnapshots)
    const scrapedAt = new Date().toISOString()

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt,
      companyCareerPage: CAREERS_URL,
      companyDomain: 'lifesigns.us',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createLifeSignsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
