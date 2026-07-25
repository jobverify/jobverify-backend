import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'
import { launchBrowser, createOptimizedPage } from '../utils/browser.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://blubridge.com/careers'
const BLUBRIDGE_HOST = new URL(CAREER_PAGE_URL).hostname

const SELECTORS = {
  listingJobRow: 'a.job-row',
}

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#8211;|&#8212;/gi, '-')
    .replace(/&bull;/gi, '•')
    .replace(/\s+/g, ' ')
    .trim()

const htmlToLines = (html) =>
  String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h1|\/h2|\/h3|\/h4|\/section|\/article)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

const escapeRegExp = (value) =>
  String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const slugToJobId = (url) => normalizeWhitespace(
  String(url ?? '')
    .replace(/\/+$/, '')
    .split('/')
    .pop(),
)

const getSafeBlubridgeUrl = (value) => {
  try {
    const url = new URL(value, CAREER_PAGE_URL)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.hostname === BLUBRIDGE_HOST ? url.href.split('#')[0] : null
  } catch {
    return null
  }
}

const toTitleCase = (value) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase())

const formatDepartment = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (normalized.includes('•')) {
    return normalized
      .split('•')
      .map((part) => toTitleCase(part))
      .filter(Boolean)
      .join(' / ')
  }

  return toTitleCase(normalized)
}

const findLineIndex = (lines, label) =>
  lines.findIndex((line) => line.toLowerCase() === String(label).toLowerCase())

const extractSection = (lines, startLabel, endLabels = []) => {
  const startIndex = findLineIndex(lines, startLabel)
  if (startIndex === -1) return []

  const normalizedEndLabels = endLabels.map((label) => String(label).toLowerCase())
  const values = []

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (normalizedEndLabels.includes(line.toLowerCase())) break
    values.push(line)
  }

  return values
}

const extractTitleFromHtml = (html) => {
  const match = /<title>([\s\S]*?)<\/title>/i.exec(String(html ?? ''))
  return normalizeWhitespace(match?.[1]).replace(/\|\s*Careers[\s\S]*$/i, '').trim() || null
}

const extractHtmlBetweenLabels = (html, startLabel, endLabels = []) => {
  const source = String(html ?? '')
  const startPattern = new RegExp(`<[^>]+>\\s*${escapeRegExp(startLabel)}\\s*<\\/[^>]+>`, 'i')
  const startMatch = startPattern.exec(source)

  if (!startMatch) return null

  const startIndex = startMatch.index + startMatch[0].length
  let endIndex = source.length

  for (const endLabel of endLabels) {
    const endPattern = new RegExp(`<[^>]+>\\s*${escapeRegExp(endLabel)}\\s*<\\/[^>]+>`, 'i')
    const remainder = source.slice(startIndex)
    const endMatch = endPattern.exec(remainder)

    if (endMatch) {
      endIndex = Math.min(endIndex, startIndex + endMatch.index)
    }
  }

  return source.slice(startIndex, endIndex)
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/remote/i.test(normalized)) return 'Remote'

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  if (parts.length > 1) return parts.at(-1)
  return normalized.replace(/\s*India\s*$/i, '').trim() || normalized
}

const buildJobDescription = (sections) =>
  sections
    .filter((section) => section.value)
    .map((section) => `${section.label}: ${section.value}`)
    .join('\n') || null

export const extractJobCards = (html) => {
  const jobs = []
  const seenUrls = new Set()
  const anchorPattern = /<a[^>]+class=["'][^"']*\bjob-row\b[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const match of String(html ?? '').matchAll(anchorPattern)) {
    const url = getSafeBlubridgeUrl(match[1])
    if (!url || seenUrls.has(url)) continue

    const lines = htmlToLines(match[2])
    const [title, department, location] = lines
    if (!title) continue

    seenUrls.add(url)
    jobs.push({
      title,
      department: department || null,
      location: location || null,
      url,
    })
  }

  return jobs
}

export const extractJobDetail = (html, sourceUrl) => {
  const lines = htmlToLines(html)
  const title = extractTitleFromHtml(html)
  const titleIndex = title
    ? lines.findIndex(
      (line) =>
        (line === title || line.endsWith(title) || line.includes(title))
        && !/\|\s*careers/i.test(line),
    )
    : -1
  const titleLine = titleIndex >= 0 ? lines[titleIndex] : null
  const departmentPrefix = titleLine && title
    ? normalizeWhitespace(
      titleLine
        .slice(0, titleLine.indexOf(title))
        .replace(/^Back to Careers\s*/i, ''),
    )
    : null
  const department = formatDepartment(departmentPrefix || (titleIndex > 0 ? lines[titleIndex - 1] : null))
  const location = titleIndex >= 0 ? lines[titleIndex + 1] || null : null
  const experienceRequired = titleIndex >= 0 ? lines[titleIndex + 2] || null : null
  const minimumQualification = extractSection(lines, 'Education', ['Key Responsibilities', 'Requirements'])[0] || null
  const aboutRole = extractSection(lines, 'About the Role', ['Education', 'Key Responsibilities']).join(' ')
  const keyResponsibilities = extractSection(lines, 'Key Responsibilities', ['Requirements', 'Added Advantage', 'Why Join BluBridge?', 'Skills'])
    .filter((value) => !['+', '✓'].includes(value))
    .join('; ')
  const requirements = extractSection(lines, 'Requirements', ['Added Advantage', 'Why Join BluBridge?', 'Skills'])
    .filter((value) => !['+', '✓'].includes(value))
    .join('; ')
  const requiredSkills = [...new Set(
    [...String(
      extractHtmlBetweenLabels(html, 'Skills', ['Ready to Join Our Team?']) ?? '',
    ).matchAll(/<span[^>]*>([^<]+)<\/span>/gi)]
      .map((match) => normalizeWhitespace(match[1]))
      .filter((value) => value && !['+', '✓'].includes(value)),
  )]

  return {
    title,
    company: 'Blubridge Technologies Pvt Ltd',
    department,
    location,
    city: extractCity(location),
    jobId: slugToJobId(sourceUrl),
    requisitionId: null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: extractSection(
      lines,
      'EMPLOYMENT',
      ['About the Role', 'VACANCIES', 'BATCH'],
    )[0] || null,
    experienceRequired,
    minimumQualification,
    preferredQualification: null,
    requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription([
      { label: 'About the Role', value: aboutRole || null },
      { label: 'Education', value: minimumQualification },
      { label: 'Key Responsibilities', value: keyResponsibilities || null },
      { label: 'Requirements', value: requirements || null },
    ]),
  }
}

const fetchRenderedHtml = async (page, url, waitForSelector) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(waitForSelector, {
    timeout: config.jobListingTimeoutMs,
  })
  await new Promise((resolve) => setTimeout(resolve, config.pageLoadDelayMs || 1000))
  return page.content()
}

export const run = async () => {
  let browser

  try {
    browser = await launchBrowser()
    const page = await createOptimizedPage(browser)
    const detailPage = await createOptimizedPage(browser)
    const listingHtml = await fetchRenderedHtml(
      page,
      CAREER_PAGE_URL,
      SELECTORS.listingJobRow,
    )
    const cards = extractJobCards(listingHtml)
    const jobs = []
    const maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null

    console.log(`  [blubridge] Found ${cards.length} visible job cards on the careers page`)

    for (const card of cards) {
      const detailHtml = await fetchRenderedHtml(detailPage, card.url, 'body')
      const detail = extractJobDetail(detailHtml, card.url)

      if (!detail.title || !detail.jobId) continue

      jobs.push({
        ...detail,
        title: detail.title || card.title,
        department: detail.department || card.department,
        location: detail.location || card.location,
        city: detail.city || extractCity(card.location),
        company: 'Blubridge Technologies Pvt Ltd',
        source: 'blubridge',
        link: detail.applyUrl || detail.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })

      if (maxJobs && jobs.length >= maxJobs) break
    }

    return jobs
  } finally {
    if (browser) await browser.close()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Blubridge scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'blubridge')
    console.log('DB result:', result)
    process.exit(0)
  }
}
