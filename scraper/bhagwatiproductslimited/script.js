import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bhagwatiproductslimited'
export const COMPANY = 'Bhagwati Products Limited'
export const HOMEPAGE_URL = 'https://www.bhagwatiproductsltd.com/'
export const CAREERS_URL = 'https://www.bhagwatiproductsltd.com/careers.html'
export const JOBS_PORTAL_URL = 'https://ess.bhagwati.co/rms'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&#8216;|&#8217;|&apos;|&rsquo;|&lsquo;/gi, "'")
  .replace(/&#8220;|&#8221;|&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const extractText = (pattern, html) => normalizeWhitespace((String(html ?? '').match(pattern) || [])[1])

const extractSectionText = (label, html) => {
  const pattern = new RegExp(
    `<b>\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*<\\/b>\\s*:?\\s*([\\s\\S]*?)<\\/div>`,
    'i',
  )
  const match = String(html ?? '').match(pattern)
  return stripTags(match?.[1] || null)
}

const normalizePostingDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const match = normalized?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

const buildDetailUrl = (detailId) =>
  toAbsoluteUrl(`/rms/Career/GetPostedJobbyID?id=${detailId}`, JOBS_PORTAL_URL)

const extractVacancyId = (applyUrl) => {
  try {
    return new URL(applyUrl).searchParams.get('VacancyId')
  } catch {
    return null
  }
}

const composeJobDescription = ({ department, role, position, jobDescription, kpi }) =>
  [
    department ? `Department: ${department}` : null,
    role ? `Role: ${role}` : null,
    position ? `Position: ${position}` : null,
    jobDescription ? `Job Description: ${jobDescription}` : null,
    kpi ? `KPI: ${kpi}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Bhagwati Products Limited \| Homepage\s*<\/title>/i.test(page)
    && normalized.includes('Made in India for the World')
    && normalized.includes("India's first intelligent product platform")
    && normalized.includes('Micromax X Huaqin')
    && /href=["']careers\.html["']/i.test(page)
}

export const extractHomepageCareersUrl = (html) =>
  toAbsoluteUrl(
    (String(html ?? '').match(/href=["']([^"']*careers\.html)["']/i) || [])[1],
    HOMEPAGE_URL,
  )

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Bhagwati Products Limited \| Careers\s*<\/title>/i.test(page)
    && /Why work at Bhagwati Products Limited/i.test(page)
    && /Open Positions/i.test(page)
    && /Currently,\s*there are no open positions\./i.test(page)
    && /visit here/i.test(page)
}

export const extractJobsPortalUrl = (html) =>
  toAbsoluteUrl(
    (String(html ?? '').match(/href=["']([^"']*ess\.bhagwati\.co[^"']*)["']/i) || [])[1],
    CAREERS_URL,
  )

export const hasOfficialJobsPortalSignal = (html) => {
  const page = String(html ?? '')

  return /BPL Job Career/i.test(page)
    && /Opening Jobs/i.test(page)
    && /openModal\(\d+\)/i.test(page)
    && /\/rms\/Career\/GetPostedJobbyID/i.test(page)
}

export const extractJobCards = (html) => {
  const page = String(html ?? '')
  const starts = [...page.matchAll(/<div class="job-item p-4 mb-4">/gi)]
    .map((match) => match.index)
    .filter((index) => Number.isInteger(index))
  const cards = []
  const seenDetailIds = new Set()

  for (let index = 0; index < starts.length; index += 1) {
    const block = page.slice(starts[index], starts[index + 1] ?? page.length)
    const detailId = (block.match(/openModal\((\d+)\)/i) || [])[1]
    if (!detailId || seenDetailIds.has(detailId)) continue

    seenDetailIds.add(detailId)
    cards.push({
      detailId,
      department: extractText(/<h5 class="mb-3">\s*([\s\S]*?)\s*<\/h5>/i, block),
      listingPosition: extractText(/Position\s*:\s*<b>\s*([\s\S]*?)\s*<\/b>/i, block),
      location: extractText(/fa-map-marker-alt[^>]*><\/i>\s*([^<]+)</i, block),
      employmentType: extractText(/fa-clock[^>]*><\/i>\s*([^<]+)</i, block),
      postingDate: normalizePostingDate(
        extractText(/fa-calendar-alt[^>]*><\/i>\s*([^<]+)</i, block),
      ),
      sourceUrl: buildDetailUrl(detailId),
    })
  }

  return cards.filter(
    (card) =>
      card.detailId
      && card.department
      && card.listingPosition
      && card.location
      && card.employmentType
      && card.postingDate
      && card.sourceUrl,
  )
}

export const hasOfficialJobDetailSignal = (html) => {
  const page = String(html ?? '')

  return /modal-title[^>]*>\s*Job Description\s*:\s*[^<]+<\/h5>/i.test(page)
    && /<b>Department<\/b>\s*:/i.test(page)
    && /<b>Role<\/b>\s*:/i.test(page)
    && /<b>Postion<\/b>\s*:/i.test(page)
    && /href=["']\/rms\/Career\?VacancyId=[^"']+["']/i.test(page)
    && /Apply Now/i.test(page)
}

export const extractJobDetail = (html, sourceUrl) => {
  const title = extractText(/modal-title[^>]*>\s*Job Description\s*:\s*([^<]+)<\/h5>/i, html)
  const department = extractText(/<b>Department<\/b>\s*:\s*([^<]+)<br/i, html)
  const role = extractText(/<b>Role<\/b>\s*:\s*([\s\S]*?)<br/i, html)
  const position = extractText(/<b>Postion<\/b>\s*:\s*([^<]+)/i, html)
  const jobDescription = extractSectionText('Job Description', html)
  const kpi = extractSectionText('KPI', html)
  const applyUrl = toAbsoluteUrl(
    (String(html ?? '').match(/href=["']([^"']*VacancyId=[^"']+)["']/i) || [])[1],
    JOBS_PORTAL_URL,
  )

  return {
    title,
    department,
    role,
    position,
    jobDescription,
    kpi,
    applyUrl,
    vacancyId: extractVacancyId(applyUrl),
    sourceUrl,
  }
}

export const hasOfficialApplyPageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*SelfRegister\s*<\/title>/i.test(page)
    && /BPL Job Career/i.test(page)
    && /<form[^>]+action=["']\/rms\/Career\/Applied["']/i.test(page)
    && /name=["']Name["']/i.test(page)
    && /name=["']EmailID["']/i.test(page)
    && /name=["']AppliedPosition["']/i.test(page)
    && /type=["']file["']/i.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createBhagwatiProductsLimitedScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Bhagwati Products Limited verified official homepage no longer matches the trusted first-party surface')
    }

    if (extractHomepageCareersUrl(homepageHtml) !== CAREERS_URL) {
      throw new Error('Bhagwati Products Limited homepage no longer links to the verified first-party careers handoff')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Bhagwati Products Limited verified careers handoff no longer matches the trusted first-party surface')
    }

    if (extractJobsPortalUrl(careersHtml) !== JOBS_PORTAL_URL) {
      throw new Error('Bhagwati Products Limited careers handoff no longer points to the verified first-party jobs portal')
    }

    const jobsPortalHtml = await fetchText(JOBS_PORTAL_URL)
    if (!hasOfficialJobsPortalSignal(jobsPortalHtml)) {
      throw new Error('Bhagwati Products Limited verified first-party jobs portal changed materially')
    }

    const jobCards = extractJobCards(jobsPortalHtml)
    if (jobCards.length === 0) {
      throw new Error('Bhagwati Products Limited verified first-party jobs portal no longer exposes trusted job cards')
    }

    const applyPageCache = new Map()
    const jobs = []

    for (const card of jobCards) {
      const detailHtml = await fetchText(card.sourceUrl)
      if (!hasOfficialJobDetailSignal(detailHtml)) {
        throw new Error('Bhagwati Products Limited verified first-party job detail surface changed materially')
      }

      const detail = extractJobDetail(detailHtml, card.sourceUrl)
      if (!detail.applyUrl || !detail.vacancyId) {
        throw new Error('Bhagwati Products Limited verified first-party job detail apply surface changed materially')
      }

      let applyPageHtml = applyPageCache.get(detail.applyUrl)
      if (!applyPageHtml) {
        applyPageHtml = await fetchText(detail.applyUrl)
        applyPageCache.set(detail.applyUrl, applyPageHtml)
      }

      if (!hasOfficialApplyPageSignal(applyPageHtml)) {
        throw new Error('Bhagwati Products Limited verified first-party apply surface changed materially')
      }

      const requisitionId = detail.vacancyId
      jobs.push({
        title: detail.title || card.listingPosition,
        company: COMPANY,
        source: SOURCE,
        country: 'India',
        location: card.location,
        city: card.location,
        department: detail.department || card.department,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        employmentType: card.employmentType,
        jobDescription: composeJobDescription({
          department: detail.department || card.department,
          role: detail.role,
          position: detail.position || card.listingPosition,
          jobDescription: detail.jobDescription,
          kpi: detail.kpi,
        }),
        sourceUrl: detail.sourceUrl,
        applyUrl: detail.applyUrl,
        jobId: `${SOURCE}-${slugify(requisitionId)}`,
        requisitionId,
        postingDate: card.postingDate,
        closingDate: null,
        link: detail.applyUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createBhagwatiProductsLimitedScraper().run(options)

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
