import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const CAREERS_URL = 'https://www.continualengine.com/careers/'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/<!--[^]*?-->/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getAttribute = (html, name) => {
  const match = String(html ?? '').match(
    new RegExp(`\\b${escapeRegExp(name)}=["']([^"']+)["']`, 'i'),
  )
  return match?.[1] || null
}

const extractContent = (html, contentId) => {
  const match = String(html ?? '').match(
    new RegExp(
      `<div\\b[^>]*\\bid=["']${escapeRegExp(contentId)}["'][^>]*>([\\s\\S]*?)<\\/div>`,
      'i',
    ),
  )

  return match?.[1] || null
}

const extractExperience = (description) => {
  const match = String(description ?? '').match(
    /(?:minimum of|minimum|at least)\s+(\d+(?:\+)?\s*(?:years?|months?))/i,
  )

  return match?.[1]?.toLowerCase() || null
}

export const extractCareerListings = (html) => [...String(html ?? '').matchAll(
  /<h3\b([^>]*\bclass=["'][^"']*elementor-tab-title[^"']*["'][^>]*)>([\s\S]*?)<\/h3>/gi,
)]
  .map((match) => {
    const headingAttributes = match[1]
    const headingId = getAttribute(headingAttributes, 'id')
    const contentId = getAttribute(headingAttributes, 'aria-controls')
    const title = normalizeWhitespace(match[2])
    const contentHtml = extractContent(html, contentId)
    const applyUrl = contentHtml?.match(
      /<a\b[^>]*class=["'][^"']*apply_now[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    )?.[1] || null
    const description = normalizeWhitespace(
      contentHtml?.replace(/<a\b[^>]*class=["'][^"']*apply_now[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, ''),
    )
    const slug = slugify(title)

    if (!headingId || !title || !contentHtml || !applyUrl || !slug) return null

    const jobId = `continualengine-${slug}`

    return {
      title,
      company: 'Continual Engine',
      department: null,
      location: null,
      city: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: `${CAREERS_URL}#${headingId}`,
      applyUrl,
      employmentType: null,
      experienceRequired: extractExperience(description),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: description,
      remoteStatus: 'On-site',
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'continualengine',
  timeoutMs: 15000,
})

export const createContinualEngineScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    return extractCareerListings(html).map((job) => ({
      ...job,
      source: 'continualengine',
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async () => createContinualEngineScraper().run()
