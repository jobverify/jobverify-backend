import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_PAGE_URL = 'https://www.ashianagroup.com/career.html'
export const APPLICATION_EMAIL = 'admin@ashianagroup.com'

const SOURCE = 'ashianagroup'
const COMPANY = 'Ashiana Group'

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

const extractFieldValue = (line, label) => normalizeWhitespace(
  String(line ?? '').replace(new RegExp(`^${label}\\s*[:\\-]+\\s*`, 'i'), ''),
) || null

const buildJobDescription = (descriptionLines) => normalizeWhitespace(descriptionLines.join(' '))

export const pageIndicatesAshianaGroupCareers = (html) => {
  const page = htmlToLines(html).join(' ')
  return (
    /Career\s+With\s+us/i.test(page)
    && /Job\s+Title/i.test(page)
    && /Ashiana Clothings Pvt\. Ltd\.\s*\(Ashiana Group\)/i.test(page)
    && /admin@ashianagroup\.com/i.test(page)
  )
}

export const extractCareerJobs = (html) => {
  if (!pageIndicatesAshianaGroupCareers(html)) {
    throw new Error('Ashiana Group careers page no longer matches the verified official careers surface')
  }

  const lines = htmlToLines(html)
  const jobs = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!/^Job Title\s*[:\-]/i.test(line || '')) continue

    const title = extractFieldValue(line, 'Job Title')
    const slug = slugify(title)
    if (!title || !slug) continue

    let cityLine = null
    let department = null
    let inDescription = false
    const descriptionLines = []

    let cursor = index + 1
    while (cursor < lines.length) {
      const currentLine = lines[cursor]

      if (/^Job Title\s*[:\-]/i.test(currentLine || '')) break
      if (/^Company\s*[:\-]/i.test(currentLine || '')) {
        cursor += 1
        continue
      }
      if (/^City\s*[:\-]/i.test(currentLine || '')) {
        cityLine = extractFieldValue(currentLine, 'City')
        cursor += 1
        continue
      }
      if (/^Job Description\s*:?\s*$/i.test(currentLine || '')) {
        inDescription = true
        cursor += 1
        continue
      }
      if (/^Industries\s*[:\-]/i.test(currentLine || '')) {
        department = extractFieldValue(currentLine, 'Industries')
        cursor += 1
        continue
      }
      if (/^(Salary|Role|Gender|Age|Ph|Email)\s*[:\-]/i.test(currentLine || '')) {
        cursor += 1
        continue
      }
      if (/^Contact\s*:?\s*$/i.test(currentLine || '')) {
        break
      }
      if (inDescription) {
        descriptionLines.push(currentLine)
      }
      cursor += 1
    }

    const minimumQualification = descriptionLines.find((item) => /I\.Com|B\.Com|M\.Com|MBA|degree/i.test(item)) || null
    const city = normalizeWhitespace(String(cityLine ?? '').split(',')[0]) || null
    const location = cityLine ? `${cityLine}, India` : null

    jobs.push({
      title,
      company: COMPANY,
      department,
      location,
      city,
      country: 'India',
      jobId: `${SOURCE}-${slug}`,
      requisitionId: `${SOURCE}-${slug}`,
      sourceUrl: CAREERS_PAGE_URL,
      applyUrl: `mailto:${APPLICATION_EMAIL}`,
      employmentType: null,
      experienceRequired: null,
      minimumQualification,
      preferredQualification: null,
      requiredSkills: descriptionLines,
      postingDate: null,
      closingDate: null,
      jobDescription: buildJobDescription(descriptionLines),
      remoteStatus: 'On-site',
    })

    index = cursor - 1
  }

  if (jobs.length === 0) {
    throw new Error('Ashiana Group careers page no longer matches the verified official careers surface')
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

export const createAshianaGroupScraper = ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText: overrideFetchText, now: overrideNow } = {}) {
    const jobs = extractCareerJobs(
      await (overrideFetchText || fetchText)(CAREERS_PAGE_URL),
    )

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createAshianaGroupScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total Ashiana Group jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
