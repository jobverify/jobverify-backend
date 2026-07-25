import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sahyadriindustries'
export const COMPANY = 'Sahyadri Industries'
export const CAREERS_URL = 'https://www.silworld.in/careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&ndash;|&#8211;|\u2013/gi, '-')
  .replace(/&mdash;|&#8212;|\u2014/gi, '-')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const htmlToLines = (value, { bullets = false } = {}) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\r/g, '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(?:p|div|section|article|h[1-6])>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, bullets ? '\n- ' : '\n')
  .replace(/<\/li>/gi, '\n')
  .replace(/<\/(?:ul|ol)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const extractPopupSlugsById = (html) => {
  const popupSlugs = new Map()

  for (const match of String(html ?? '').matchAll(/<div\s+id="pum-(\d+)"[^>]*data-popmake="([^"]+)"/gi)) {
    const popupId = normalizeWhitespace(match[1])
    const decodedConfig = decodeHtmlEntities(match[2])
    const slug = decodedConfig.match(/"slug":"([^"]+)"/i)?.[1] ?? null

    if (popupId && slug) {
      popupSlugs.set(popupId, slug)
    }
  }

  return popupSlugs
}

const extractPopupContentById = (html) => {
  const popupContent = new Map()

  for (const match of String(html ?? '').matchAll(
    /<div\s+id="pum-(\d+)"[\s\S]*?<div class="pum-content popmake-content"[^>]*>([\s\S]*?)<\/div>\s*<button type="button" class="pum-close/gi,
  )) {
    popupContent.set(match[1], match[2])
  }

  return popupContent
}

const normalizePopupDescription = (value) => {
  const lines = htmlToLines(value, { bullets: true })

  if (lines[0]?.toLowerCase() === 'job description') {
    lines.shift()
  }

  return lines.join('\n') || null
}

const extractExperienceRequired = (description) => {
  const match = String(description ?? '').match(/Experience:\s*([\s\S]*?)(?:Work Schedule:|$)/i)
  if (!match) {
    const firstLine = String(description ?? '').split('\n').find(Boolean) ?? ''
    return /^Experience in /i.test(firstLine) ? normalizeWhitespace(firstLine) : null
  }

  const summary = normalizeWhitespace(match[1].split(/\bCandidates\b/i)[0])
  return summary || null
}

const extractJobCards = (html) => {
  const cards = []

  for (const match of String(html ?? '').matchAll(
    /<div class="elementor-column elementor-col-50 elementor-top-column[\s\S]*?<h5[^>]*>\s*Job\s+\d+\s*<\/h5>[\s\S]*?<\/section>\s*<\/div>\s*<\/div>/gi,
  )) {
    const block = match[0]
    const popupIds = [...block.matchAll(/popmake-(\d+)/gi)].map((popupMatch) => popupMatch[1])
    const detailPopupId = popupIds[0] ?? null
    const applyPopupId = popupIds.at(-1) ?? null
    const paragraphs = [...block.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    const valueLines = htmlToLines(paragraphs.at(-1)?.[1] ?? null)

    if (popupIds.length < 2 || !/Apply Now/i.test(block)) {
      throw new Error('Sahyadri Industries public jobs were extracted from cards but the shared first-party apply surface changed')
    }

    if (!detailPopupId || !applyPopupId || valueLines.length < 4) {
      throw new Error('Sahyadri Industries verified careers job card no longer matches the trusted public shape')
    }

    const [title, department, minimumQualification, location] = valueLines
    cards.push({
      title,
      department,
      minimumQualification,
      location,
      detailPopupId,
      applyPopupId,
    })
  }

  return cards
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''
  const popupSlugs = extractPopupSlugsById(rawHtml)
  const availablePopupSlugs = new Set(popupSlugs.values())

  return /<title>\s*Careers\s*&#8211;\s*Sahyadri Industries Limited\s*<\/title>/i.test(rawHtml)
    && /<link rel="canonical" href="https:\/\/www\.silworld\.in\/careers\/"/i.test(rawHtml)
    && /alt="Sahyadri Industries Limited"/i.test(rawHtml)
    && normalized.includes('job openings')
    && normalized.includes('Our Work Culture')
    && /nf-form-cont/i.test(rawHtml)
    && /Resume/i.test(rawHtml)
    && availablePopupSlugs.has('job')
    && availablePopupSlugs.has('sales-executive-job-desc')
    && availablePopupSlugs.has('asm-job-desc')
}

export const extractJobsFromCareersPage = (html, { scrapedAt = new Date().toISOString() } = {}) => {
  const popupSlugs = extractPopupSlugsById(html)
  const popupContent = extractPopupContentById(html)
  const jobCards = extractJobCards(html)

  return jobCards.map((card) => {
    const detailSlug = popupSlugs.get(card.detailPopupId)
    const applySlug = popupSlugs.get(card.applyPopupId)
    const description = normalizePopupDescription(popupContent.get(card.detailPopupId))

    if (!detailSlug || !description) {
      throw new Error('Sahyadri Industries verified job detail popup no longer matches the trusted public surface')
    }

    if (applySlug !== 'job') {
      throw new Error('Sahyadri Industries public jobs were extracted from cards but the shared first-party apply popup changed')
    }

    return {
      title: card.title,
      company: COMPANY,
      location: card.location,
      city: card.location,
      jobId: detailSlug,
      requisitionId: card.detailPopupId,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      department: card.department,
      employmentType: null,
      experienceRequired: extractExperienceRequired(description),
      minimumQualification: card.minimumQualification,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: description,
      source: SOURCE,
      link: CAREERS_URL,
      scrapedAt,
    }
  })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createSahyadriIndustriesScraper = ({ now = () => new Date() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Sahyadri Industries verified official careers page no longer matches the known public surface')
    }

    const jobs = extractJobsFromCareersPage(careersHtml, {
      scrapedAt: now().toISOString(),
    })

    if (jobs.length === 0) {
      throw new Error('Sahyadri Industries public jobs were extracted as zero; verify whether the surface changed')
    }

    return jobs
  },
})

export const run = async (options = {}) => createSahyadriIndustriesScraper().run(options)

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
