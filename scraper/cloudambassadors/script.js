import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'cloudambassadors'
export const CAREERS_URL = 'https://cloudambassadors.com/careers'
export const APPLICATION_URL = 'https://cloudambassadors.com/careers/apply'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/<!--[^]*?-->/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toJobId = (title) => normalizeWhitespace(title)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

const extractOpenRolesSection = (html) => {
  const text = String(html ?? '')
  const openRolesIndex = text.search(/>\s*Open Roles\s*</i)
  if (openRolesIndex < 0) return ''

  const sectionEnd = text.indexOf('</section>', openRolesIndex)
  return text.slice(openRolesIndex, sectionEnd < 0 ? undefined : sectionEnd)
}

export const hasSharedApplicationSignal = (html) => {
  const text = normalizeWhitespace(html) || ''

  return /<title>\s*Cloud Ambassadors[^<]*Maximizing Cloud Impact\s*<\/title>/i.test(String(html ?? ''))
    && /Role &amp; Experience/i.test(String(html ?? ''))
    && /\bLocation\b/i.test(text)
    && /\bEmail\b/i.test(text)
}

export const extractCareerListings = (html) => {
  const roleSection = extractOpenRolesSection(html)
  const titles = [...roleSection.matchAll(
    /<button\b[^>]*class=["'][^"']*\bcursor-pointer\b[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi,
  )]
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

  return titles.map((title) => {
    const jobId = toJobId(title)

    return {
      title,
      company: 'Cloud Ambassadors',
      department: null,
      location: null,
      city: null,
      state: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: APPLICATION_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      publicExperienceChecked: true,
      remoteStatus: null,
    }
  })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cloudambassadors',
  timeoutMs: 15000,
})

export const createCloudAmbassadorsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    const applicationHtml = await fetchText(APPLICATION_URL)

    if (!hasSharedApplicationSignal(applicationHtml)) {
      throw new Error('Cloud Ambassadors shared apply page no longer matches the verified public application surface')
    }

    return extractCareerListings(careersHtml).map((job) => ({
      ...job,
      source: 'cloudambassadors',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createCloudAmbassadorsScraper().run()

export const runStandalone = async ({
  argv = process.argv,
  fetchText,
  saveToFile,
  saveToDB,
} = {}) => {
  const jobs = await createCloudAmbassadorsScraper().run({
    fetchText: fetchText ?? defaultFetchText,
  })

  if (argv.includes('--dry-run')) {
    const writeJobsToFile = saveToFile
      ?? (await import('../../scraper-support/utils/saveToDB.js')).saveToFile
    writeJobsToFile(jobs, path.join(currentDir, 'jobs.json'))
    return jobs
  }

  const persistJobsToDb = saveToDB
    ?? (await import('../../scraper-support/utils/saveToDB.js')).saveToDB
  await persistJobsToDb(jobs, SOURCE)
  return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runStandalone()
}
