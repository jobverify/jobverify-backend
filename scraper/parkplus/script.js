import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'parkplus'
export const COMPANY = 'Park+'
export const CAREERS_URL = 'https://parkplus.io/careers'
export const OFFICIAL_HOSTNAME = 'parkplus.io'

const normalizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const extractNextData = (html = '') => {
  const match = String(html).match(
    /<script[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  )

  if (!match?.[1]) return null

  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

const isOfficialCareersUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === OFFICIAL_HOSTNAME
      && url.pathname.replace(/\/+$/, '') === '/careers'
  } catch {
    return false
  }
}

export const extractOfficialJobs = (html = '') => {
  const data = extractNextData(html)
  const jobs = data?.props?.pageProps?.data?.jobs

  if (!Array.isArray(jobs)) return null

  return jobs.map((job) => ({
    id: job?.id,
    title: normalizeText(job?.attributes?.title),
    department: normalizeText(job?.attributes?.department),
    location: normalizeText(job?.attributes?.location),
    experienceRequired: normalizeText(job?.attributes?.experience),
    description: normalizeText(job?.attributes?.whatYouWillDo),
    slug: normalizeText(job?.attributes?.slug),
    isClosed: job?.attributes?.isClosed === true,
  }))
}

const isValidOfficialJob = (job) => (
  Number.isInteger(job.id)
  && job.id > 0
  && job.title
  && job.department
  && job.location
  && job.description
  && job.slug
)

export const createParkPlusScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const page = await fetchPage(CAREERS_URL)
    if (Number(page?.status) !== 200 || !isOfficialCareersUrl(page?.url)) {
      throw new Error('Park+ official careers page no longer matches the verified first-party surface')
    }

    const jobs = extractOfficialJobs(page.html)
    if (jobs === null) {
      throw new Error('Park+ official careers payload no longer exposes a jobs array')
    }

    if (jobs.some((job) => !isValidOfficialJob(job))) {
      throw new Error('Park+ official careers payload contains an invalid job record')
    }

    return jobs
      .filter((job) => !job.isClosed)
      .map((job) => ({
        title: job.title,
        company: COMPANY,
        department: job.department,
        location: job.location,
        city: null,
        country: 'India',
        jobId: `parkplus-${job.id}`,
        requisitionId: job.slug,
        sourceUrl: CAREERS_URL,
        applyUrl: CAREERS_URL,
        employmentType: null,
        experienceRequired: job.experienceRequired || null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: job.description,
        source: SOURCE,
        link: CAREERS_URL,
        scrapedAt: now(),
      }))
  },
})

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Jobify first-party careers scraper',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const run = async (options = {}) => createParkPlusScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/parkplus/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
