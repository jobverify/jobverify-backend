import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const COMPANY_HOME_URL = 'https://www.alohatechnology.com/'
export const CAREERS_PAGE_URL = 'https://www.alohatechnology.com/careers.html'
export const APPLICATION_EMAIL = 'hr@alohatechnology.com'

const SOURCE = 'alohatechnology'
const COMPANY = 'Aloha Technology'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const htmlToLines = (html) => decodeHtml(String(html ?? ''))
  .replace(/\r/g, '')
  .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|\/section|\/article|\/main)\b[^>]*>/gi, '\n')
  .replace(/<(p|div|li|h[1-6]|ul|ol|section|article|main)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[ \t\f\v]+/g, ' ')
  .replace(/\n+/g, '\n')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const normalizeExperience = (value) => normalizeWhitespace(
  String(value ?? '').replace(/^Experience\s*[:\-]+\s*/i, ''),
) || null

const buildJobDescription = ({ experienceRequired, requiredSkills }) => {
  const details = requiredSkills.join(' ')
  return normalizeWhitespace(
    `Experience: ${experienceRequired || 'Not specified'} Profile: ${details} Apply by emailing ${APPLICATION_EMAIL}.`,
  )
}

export const pageIndicatesAlohaTechnologyCareers = (html) => {
  const page = String(html ?? '')
  return (
    /JOIN\s+OUR\s+TEAM/i.test(page)
    && /hr@alohatechnology\.com/i.test(page)
    && /current\s+openings\s+at\s+Aloha/i.test(page)
  )
}

export const extractCareerJobs = (html) => {
  if (!pageIndicatesAlohaTechnologyCareers(html)) {
    throw new Error('Aloha Technology careers page no longer exposes the expected public openings')
  }

  const lines = htmlToLines(html)
  const jobs = []

  for (let index = 0; index < lines.length; index += 1) {
    const title = lines[index]
    const experienceLine = lines[index + 1]
    const profileLine = lines[index + 2]

    if (!title || !/^Experience\s*[:-]/i.test(experienceLine || '') || !/^Profile$/i.test(profileLine || '')) {
      continue
    }

    const requiredSkills = []
    let cursor = index + 3

    while (cursor < lines.length) {
      const currentLine = lines[cursor]
      const nextLine = lines[cursor + 1]

      if (currentLine && /^Experience\s*[:-]/i.test(nextLine || '')) {
        break
      }

      requiredSkills.push(currentLine)
      cursor += 1
    }

    const slug = slugify(title)
    if (!slug) continue

    const experienceRequired = normalizeExperience(experienceLine)

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: null,
      city: null,
      country: null,
      jobId: `${SOURCE}-${slug}`,
      requisitionId: `${SOURCE}-${slug}`,
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: `mailto:${APPLICATION_EMAIL}`,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills,
      postingDate: null,
      closingDate: null,
      jobDescription: buildJobDescription({ experienceRequired, requiredSkills }),
    })

    index = cursor - 1
  }

  if (jobs.length === 0) {
    throw new Error('Aloha Technology careers page no longer exposes the expected public openings')
  }

  return jobs
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createAlohaTechnologyScraper = ({ fetchText = defaultFetchText } = {}) => ({
  async run({ fetchText: overrideFetchText } = {}) {
    const jobs = extractCareerJobs(
      await (overrideFetchText || fetchText)(CAREERS_PAGE_URL),
    )

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createAlohaTechnologyScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total Aloha Technology jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
