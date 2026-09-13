import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'genexspace'
export const COMPANY = 'Genex Space'
export const HOMEPAGE_URL = 'https://genex.space/'
export const FELLOWSHIP_URL = 'https://genex.space/gsef/'
export const REACH_US_URL = 'https://genex.space/reach-us'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const JOB_DESCRIPTION =
  'Join the Genex Space Explorers Fellowship for Indian nationals as a full-time two-year fellowship with a stipend and first-party resume-upload application.'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title[^>]*>\s*Genex Space:\s*Space Experience (?:&amp;|&) Innovation Ecosystem\s*<\/title>/i.test(page)
    && /Genex Space designs[\s\S]*Space Experience Centers[\s\S]*Innovation Labs[\s\S]*India/i.test(page)
    && /<div[^>]+id=["']root["'][^>]*>/i.test(page)
    && Boolean(extractAppBundleUrl(page))
}

export const extractAppBundleUrl = (html) => {
  const match = String(html ?? '').match(
    /<script[^>]+type=["']module["'][^>]+src=["']([^"']*\/assets\/index-[^"']+\.js)["'][^>]*>/i,
  )
  if (!match?.[1]) return null

  try {
    const url = new URL(match[1], HOMEPAGE_URL)
    return url.origin === new URL(HOMEPAGE_URL).origin ? url.toString() : null
  } catch {
    return null
  }
}

export const hasOfficialAppBundleSignal = (javascript) => {
  const source = String(javascript ?? '')
  return /name:["']Genex Space["']/i.test(source)
    && /tagline:["']Space Experience (?:&|and) Innovation Ecosystem["']/i.test(source)
    && /email:["']info@genex\.space["']/i.test(source)
    && /label:["']Reach Us["'],to:["']\/reach-us["']/i.test(source)
    && /\bJoin Us\b/i.test(source)
    && /We hire experience designers, engineers, educators, and program managers/i.test(source)
    && /Send a profile to/i.test(source)
    && /path:["']reach-us["']/i.test(source)
    && /path:["']\*["']/i.test(source)
    && /Page Not Found/i.test(source)
}

export const hasPublicJobsSignal = (value) => [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bsearch jobs\b/i,
  /\bview jobs\b/i,
  /\bapply now\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
].some((pattern) => pattern.test(String(value ?? '')))

export const hasOfficialFellowshipSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Genex Space Explorers Fellowship/i.test(text)
    && /Indian nationals/i.test(text)
    && /full-time Fellows/i.test(text)
    && /(two-year commitment|two-year program)/i.test(text)
    && /stipend/i.test(text)
    && /<form\b/i.test(page)
    && /type=["']file["']/i.test(page)
    && /Apply Now/i.test(text)
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialFellowshipSignal(html)) {
    throw new Error('Genex Space verified official fellowship page no longer matches the trusted public surface')
  }

  return [{
    title: 'Genex Space Explorers Fellowship',
    company: COMPANY,
    department: 'Fellowship',
    location: 'India',
    city: null,
    country: 'India',
    jobId: `${SOURCE}-${slugify('Genex Space Explorers Fellowship')}`,
    requisitionId: `${SOURCE}-gsef`,
    sourceUrl: FELLOWSHIP_URL,
    applyUrl: FELLOWSHIP_URL,
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: JOB_DESCRIPTION,
    remoteStatus: null,
  }]
}

const defaultFetchText = async (url, { signal } = {}) => {
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createGenexSpaceScraper = () => ({
  async run({ fetchText = defaultFetchText, signal } = {}) {
    signal?.throwIfAborted()
    const read = async url => { signal?.throwIfAborted(); const value = await fetchText(url, { signal }); signal?.throwIfAborted(); return value }
    const homepageHtml = await read(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Genex Space verified official homepage no longer matches the trusted first-party surface')
    }

    const appBundleUrl = extractAppBundleUrl(homepageHtml)
    const appBundle = await read(appBundleUrl)
    if (!hasOfficialAppBundleSignal(appBundle)) {
      throw new Error('Genex Space verified Join Us surface no longer matches the trusted first-party app')
    }

    if (hasPublicJobsSignal(appBundle)) {
      throw new Error('Genex Space first-party app now appears to expose public jobs')
    }

    throw Object.assign(new Error('Genex Space public job inventory is unavailable: company pages do not prove zero openings'), { code: 'GENEX_INVENTORY_UNAVAILABLE', softFailure: true, failureKind: 'upstream_inventory_unavailable', abortRetries: true })
  },
})

export const run = async (options = {}) => createGenexSpaceScraper().run(options)

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
