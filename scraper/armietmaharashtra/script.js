import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { normalizeCity } from '../utils/cityNormalizer.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://armiet.in/career/'
export const APPLY_URL = 'https://forms.gle/SAVWB6HD2V7bKv7x6'

const COMPANY = 'ARMIET Maharashtra'
const SOURCE = 'armietmaharashtra'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(value)
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const cleanLine = (value) => normalizeWhitespace(value)
  .replace(/^[•*-]\s*/, '')
  .trim()

const slugify = (value) => cleanLine(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const htmlToLines = (html) => decodeHtml(String(html ?? ''))
  .replace(/\r/g, '')
  .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|\/section|\/article|\/main)\b[^>]*>/gi, '\n')
  .replace(/<(p|div|li|h[1-6]|ul|ol|section|article|main)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => cleanLine(line))
  .filter(Boolean)

const buildDescription = (...values) => cleanLine(
  values
    .flat()
    .filter(Boolean)
    .join(' '),
) || null

const parseLabelValue = (lines, labels) => {
  for (const label of labels) {
    const pattern = new RegExp(`^${label}\\s*:`, 'i')
    const line = lines.find((item) => pattern.test(item))
    if (!line) continue
    return cleanLine(line.replace(pattern, ''))
  }

  return null
}

const normalizeLocation = (value) => {
  const location = cleanLine(value)
  if (!location) return null
  return /\bindia\b/i.test(location) ? location : `${location}, India`
}

const extractDepartment = (title) => {
  const match = String(title ?? '').match(/\(([^)]+)\)/)
  return cleanLine(match?.[1] || '') || null
}

const extractRequiredSkills = (lines) => {
  const inlineBranches = lines
    .map((line) => line.match(/^Branches\s*:\s*(.+)$/i)?.[1])
    .find(Boolean)
  if (inlineBranches) return [cleanLine(inlineBranches)]

  const branchesIndex = lines.findIndex((line) => /^Branches\s*:?$/i.test(line))
  if (branchesIndex < 0) return []

  const nextLine = cleanLine(lines[branchesIndex + 1] || '')
  return nextLine ? [nextLine] : []
}

const buildJobDescription = (lines, requiredSkills, minimumQualification) => {
  const note = parseLabelValue(lines, ['Note'])
  return buildDescription(requiredSkills, minimumQualification, note)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<h[1-3][^>]*>\s*Career\s*<\/h[1-3]>/i.test(page)
    && /armietdigital@gmail\.com/i.test(page)
    && /forms\.gle\/SAVWB6HD2V7bKv7x6/i.test(page)
}

export const extractPublicListings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Expected verified ARMIET careers surface with public opportunities')
  }

  const jobs = []

  for (const match of String(html ?? '').matchAll(/<h4\b[^>]*>([\s\S]*?)<\/h4>([\s\S]*?)(?=<h4\b|<a\b[^>]*href=|$)/gi)) {
    const title = cleanLine(match[1])
    const lines = htmlToLines(match[2])
    const slug = slugify(title)

    if (!title || !slug) continue

    const requiredSkills = extractRequiredSkills(lines)
    const minimumQualification = parseLabelValue(lines, ['Eligibility', 'Qualification'])
    const employmentType = parseLabelValue(lines, ['Job Types', 'Job Type'])
    const locationValue = parseLabelValue(lines, ['Teaching Location', 'Job Location', 'Location'])
    const location = normalizeLocation(locationValue)
    const city = normalizeCity(cleanLine(String(locationValue ?? '').split(',')[0] || null))

    jobs.push({
      title,
      company: COMPANY,
      department: extractDepartment(title),
      location,
      city,
      country: 'India',
      jobId: `${SOURCE}-${slug}`,
      requisitionId: `${SOURCE}-${slug}`,
      sourceUrl: `${CAREERS_URL}#${slug}`,
      applyUrl: APPLY_URL,
      employmentType,
      experienceRequired: null,
      minimumQualification,
      preferredQualification: null,
      requiredSkills,
      postingDate: null,
      closingDate: null,
      jobDescription: buildJobDescription(lines, requiredSkills, minimumQualification),
      remoteStatus: 'On-site',
    })
  }

  if (jobs.length === 0) {
    throw new Error('Expected verified ARMIET careers surface with public opportunities')
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createArmietMaharashtraScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    return extractPublicListings(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createArmietMaharashtraScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total ARMIET Maharashtra jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
