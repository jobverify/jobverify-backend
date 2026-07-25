import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'hawkinscookersltd'
export const COMPANY = 'Hawkins Cookers Ltd'
export const HOMEPAGE_URL = 'https://www.hawkinscookers.com/'
export const CAREERS_URL = 'https://www.hawkinscookers.com/Job_Openings_R.aspx'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[â€™]/g, "'")
    .replace(/[â€“â€”]/g, '-')
    .replace(/[₹]/g, 'Rs.')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol|\/tr|\/td)\b[^>]*>/gi, '\n')
    .replace(/<(li|p|tr)\b[^>]*>/gi, '\n')
    .replace(/<td\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const extractSpanText = (html, id) => stripTags(
  String(html ?? '').match(new RegExp(`<span[^>]+id="${id}"[^>]*>([\\s\\S]*?)<\\/span>`, 'i'))?.[1],
)

const extractCardTitle = (html, id) => stripTags(
  String(html ?? '').match(new RegExp(`<span[^>]+id="${id}"[^>]*>([\\s\\S]*?)<\\/span>`, 'i'))?.[1],
)

const extractCards = (html) => String(html ?? '')
  .split(/<div class="div-column-card">/i)
  .slice(1)

const extractCardDescription = (cardHtml, { title, trailingLabels = [] } = {}) => {
  const text = stripTags(cardHtml)
  if (!text) return null

  let description = text

  if (title) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    description = description.replace(new RegExp(`^${escapedTitle}\\s*`, 'i'), '')
  }

  for (const label of trailingLabels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    description = description.replace(new RegExp(`\\s*${escapedLabel}\\s*`, 'gi'), ' ')
  }

  return normalizeWhitespace(description)
}

const trimBeforeLabel = (value, label) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const index = normalized.toLowerCase().indexOf(String(label).toLowerCase())
  if (index < 0) return normalized

  return normalizeWhitespace(normalized.slice(0, index))
}

export const hasOfficialJobsSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Hawkins Job Openings\s*<\/title>/i.test(page)
    && /<form[^>]+id="form1"/i.test(page)
    && /<form[^>]+action="\.\/Job_Openings_R\.aspx"/i.test(page)
    && /<span[^>]+id="lbl_title"[^>]*>\s*Opportunities\s*<\/span>/i.test(page)
    && /id="btn_mgmt_roles"/i.test(page)
    && /id="Button1"/i.test(page)
    && /id="btn_appt_apply"/i.test(page)
    && /Management Trainees/i.test(page)
    && /Summer Internship at Hawkins/i.test(page)
    && /Apprentices/i.test(page)
    && /id="lbl_se_msg"/i.test(page)
    && /id="lbl_appt_msg"/i.test(page)
}

export const extractOpenings = (html) => {
  if (!hasOfficialJobsSignal(html)) {
    throw new Error('Verified official Hawkins job openings surface changed materially')
  }

  const cards = extractCards(html)
  if (cards.length !== 3) {
    throw new Error('Verified official Hawkins job openings surface changed materially')
  }

  const managementCard = cards.find((card) => /btn_mgmt_roles/i.test(card))
  const internshipCard = cards.find((card) => /id="Button1"/i.test(card))
  const apprenticeshipCard = cards.find((card) => /btn_appt_apply/i.test(card))

  if (!managementCard || !internshipCard || !apprenticeshipCard) {
    throw new Error('Verified official Hawkins job openings surface changed materially')
  }

  const managementTitle = extractCardTitle(managementCard, 'lbl_title_Mgmt')
  const managementDescription = extractCardDescription(managementCard, {
    title: managementTitle,
    trailingLabels: ['Know More >', 'See Roles'],
  })

  const internshipTitle = extractCardTitle(internshipCard, 'Label2')
  const internshipDescription = extractCardDescription(internshipCard, {
    title: internshipTitle,
    trailingLabels: ['Know More >', 'Show less >', 'See Roles & Projects'],
  })

  const apprenticeshipTitle = extractCardTitle(apprenticeshipCard, 'lbl_title_Apprentices')
  const apprenticeshipDescription = extractCardDescription(apprenticeshipCard, {
    title: apprenticeshipTitle,
    trailingLabels: ['Know More >', 'Show less >', 'Apply Now'],
  })

  const openings = [
    {
      title: managementTitle,
      department: 'Management Trainees',
      location: 'India',
      city: null,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: null,
      descriptionSnippet: managementDescription,
    },
    {
      title: internshipTitle,
      department: 'Internship',
      location: 'India',
      city: null,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: 'Internship',
      descriptionSnippet: internshipDescription,
    },
    {
      title: apprenticeshipTitle,
      department: 'Apprenticeship',
      location: 'Thane / Hoshiarpur / Jaunpur, India',
      city: null,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: 'Apprenticeship',
      descriptionSnippet: trimBeforeLabel(apprenticeshipDescription, 'How to Apply'),
    },
  ]

  if (openings.some((opening) => !opening.title || !opening.descriptionSnippet)) {
    throw new Error('Verified official Hawkins job openings surface changed materially')
  }

  return openings
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

export const createHawkinsCookersLtdScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    const jobs = extractOpenings(html)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => {
      const identitySlug = slugify(job.title)

      return {
        ...job,
        company: COMPANY,
        country: 'India',
        jobId: `${SOURCE}-${identitySlug}`,
        requisitionId: `${SOURCE}-${identitySlug}`,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: job.descriptionSnippet,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }
    })
  },
})

export const run = async (options = {}) => createHawkinsCookersLtdScraper().run(options)

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
