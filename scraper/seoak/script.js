import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'seoak'
export const COMPANY = 'SEOAK Innovations Private Limited'
export const CAREERS_URL = 'https://www.seoak.in/careers'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const stripTags = (value) => normalizeWhitespace(value)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /Discover Career/i.test(page)
    && /Opportunities at SEOAK!/i.test(page)
    && /<h1>\s*Open Position\s*<\/h1>/i.test(page)
    && /career-cards-container\s+web-view/i.test(page)
    && /SEOAK INNOVATIONS PRIVATE LIMITED/i.test(page)
}

const extractLabelValue = (cardHtml, label) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return stripTags(
    String(cardHtml ?? '').match(new RegExp(`<div>\\s*${escapedLabel}:([\\s\\S]*?)<\\/div>`, 'i'))?.[1],
  )
}

export const extractOpenings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('SEOAK verified official public careers surface changed or disappeared')
  }

  const page = String(html ?? '')
  const desktopStart = page.indexOf('<div class="career-cards-container web-view">')
  const mobileStart = desktopStart >= 0 ? page.indexOf('<div class="mob-view carousel">', desktopStart) : -1
  const desktopSection = desktopStart >= 0 && mobileStart > desktopStart
    ? page.slice(desktopStart, mobileStart)
    : null

  if (!desktopSection) {
    throw new Error('SEOAK verified official public careers surface changed or disappeared')
  }

  const jobs = desktopSection
    .split('<div class="career-card bg-light-4 cursor">')
    .slice(1)
    .map((cardHtml) => {
      const title = stripTags(cardHtml.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1])
      const department = extractLabelValue(cardHtml, 'Type')
      const locationLabel = extractLabelValue(cardHtml, 'Location')

      if (!title || !department || !locationLabel) return null

      return {
        title,
        department,
        location: `${locationLabel}, India`,
        city: null,
        sourceUrl: CAREERS_URL,
        applyUrl: CAREERS_URL,
        employmentType: null,
        remoteStatus: /work from office/i.test(locationLabel) ? 'On-site' : null,
      }
    })
    .filter(Boolean)

  if (jobs.length === 0) {
    throw new Error('SEOAK verified official public careers surface changed or disappeared')
  }

  return jobs
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createSeoakScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    return extractOpenings(html).map((job) => {
      const identitySlug = slugify(job.title)

      return {
        ...job,
        company: COMPANY,
        country: 'India',
        jobId: `${SOURCE}-${identitySlug}`,
        requisitionId: `${SOURCE}-${identitySlug}`,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }
    })
  },
})

export const run = async (options = {}) => createSeoakScraper().run(options)

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
