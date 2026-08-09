import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'logicfruittechnologies'
export const COMPANY = 'Logic Fruit Technologies'
export const CAREERS_URL = 'https://www.logic-fruit.com/career/jobs-current-opening/'
export const APPLY_URL = 'https://www.logic-fruit.com/career/application-form/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractTitle = (html = '') => stripTags(
  String(html ?? '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1],
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).href
  } catch {
    return null
  }
}

const normalizeLocation = (value) => {
  const normalized = stripTags(value)
  if (!normalized) return null

  const cleaned = normalized
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim()

  return /\bindia\b/i.test(cleaned) ? cleaned : `${cleaned}, India`
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const [firstPart] = normalized.split('/').map((part) => part.split(',')[0]?.trim()).filter(Boolean)
  return normalizeCity(firstPart || normalized)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''
  const title = extractTitle(page) || ''

  return /^Current Jobs Opening\s*-\s*Logic Fruit Technologies$/i.test(title)
    && /Create Your Future With Us!/i.test(text)
    && /Current Openings/i.test(text)
    && /Open Positions In Logic Fruit/i.test(text)
    && /theplus-tabs-content-wrapper/i.test(page)
    && /jobs-current-opening\//i.test(page)
}

export const extractTabbedOpeningSections = (html = '') => {
  const page = String(html ?? '')
  const wrapperIndex = page.indexOf('theplus-tabs-content-wrapper')
  if (wrapperIndex === -1) return []

  return page
    .slice(wrapperIndex)
    .split(/<div class="elementor-tab-title elementor-tab-mobile-title[^>]*>/i)
    .slice(1)
    .map((sectionHtml) => {
      const label = stripTags(sectionHtml.match(/<span>([\s\S]*?)<\/span>/i)?.[1])
      const contentIndex = sectionHtml.indexOf('<div id="elementor-tab-content')
      if (contentIndex === -1) return null

      return {
        label,
        html: sectionHtml.slice(contentIndex),
      }
    })
    .filter(Boolean)
}

export const extractOpeningCardsFromSection = (sectionHtml = '') =>
  String(sectionHtml ?? '')
    .split(/<div\s+data-tp-sc-link=/i)
    .slice(1)
    .map((cardHtml) => {
      const sourceUrl = toAbsoluteUrl(
        cardHtml.match(
          /<h[1-6][^>]*class=["'][^"']*elementor-heading-title[^"']*["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i,
        )?.[1],
      )
      const title = stripTags(
        cardHtml.match(
          /<h[1-6][^>]*class=["'][^"']*elementor-heading-title[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
        )?.[1],
      )
      const location = normalizeLocation(
        cardHtml.match(
          /<span[^>]*class=["'][^"']*elementor-icon-list-text[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
        )?.[1],
      )

      return {
        title,
        location,
        city: deriveCity(location),
        sourceUrl,
        applyUrl: sourceUrl || APPLY_URL,
        remoteStatus: 'On-site',
      }
    })
    .filter((job) => job.title && job.location && job.sourceUrl)

const scoreOpeningSpecificity = (job = {}) => {
  const location = normalizeWhitespace(job.location) || ''

  return location.length
    + (location.includes('/') ? 100 : 0)
    + ((location.match(/,/g) || []).length * 5)
}

export const mergePreferredOpening = (existingJob, candidateJob) => {
  if (!existingJob) return candidateJob
  if (!candidateJob) return existingJob

  return scoreOpeningSpecificity(candidateJob) > scoreOpeningSpecificity(existingJob)
    ? { ...existingJob, ...candidateJob }
    : existingJob
}

export const extractOpenings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error(
      'Logic Fruit Technologies verified official public careers surface no longer matches the expected page',
    )
  }

  const jobsBySourceUrl = new Map()

  for (const section of extractTabbedOpeningSections(html)) {
    for (const job of extractOpeningCardsFromSection(section.html)) {
      jobsBySourceUrl.set(
        job.sourceUrl,
        mergePreferredOpening(jobsBySourceUrl.get(job.sourceUrl), job),
      )
    }
  }

  const jobs = [...jobsBySourceUrl.values()]

  if (jobs.length === 0) {
    throw new Error('Logic Fruit Technologies verified public openings changed or disappeared')
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

export const createLogicFruitTechnologiesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    const scrapedAt = now()

    return extractOpenings(html).map((job) => {
      const identitySlug = slugify(`${job.title}-${job.location}`)

      return {
        ...job,
        company: COMPANY,
        department: null,
        country: 'India',
        jobId: `${SOURCE}-${identitySlug}`,
        requisitionId: `${SOURCE}-${identitySlug}`,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt,
      }
    })
  },
})

export const run = async (options = {}) => createLogicFruitTechnologiesScraper().run(options)

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
