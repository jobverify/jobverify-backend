import path from 'path'
import { fileURLToPath } from 'url'

const BASE_URL = 'https://asip-tech.com'
export const CAREERS_PAGE_URL = `${BASE_URL}/careers/`
const currentDir = path.dirname(fileURLToPath(import.meta.url))

const normalizeWhitespace = (value) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#8211;|&#x2013;/gi, '-')
  .replace(/&#8212;|&#x2014;/gi, '-')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .replace(/^["'>]+/, '')
  .trim()

const toAbsoluteUrl = (value) => new URL(value, BASE_URL).toString()

const slugFromUrl = (url) => {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  return parts[parts.length - 1] || null
}

const extractField = (html, label) => {
  const match = String(html || '').match(new RegExp(`${label}\\s*:?\\s*(?:<[^>]*>\\s*){0,3}([^<]+)`, 'i'))
  return match ? normalizeWhitespace(match[1]) : null
}

const extractDescription = (html) => {
  const match = String(html || '').match(/<div[^>]+class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
  return normalizeWhitespace(match ? match[1] : '') || null
}

export const extractListings = (html) => {
  const source = String(html || '')
  const listingBlocks = [...source.matchAll(/<div[^>]+class=["'][^"']*job-listing[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map((match) => match[1])

  return listingBlocks
    .map((block) => {
      const linkMatch = block.match(/<a[^>]+href=["']([^"']*\/career\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
      if (!linkMatch) return null

      const sourceUrl = toAbsoluteUrl(linkMatch[1])
      const title = normalizeWhitespace(linkMatch[2])
      const department = extractField(block, 'job-category')
      const employmentType = extractField(block, 'job-type')
      const city = extractField(block, 'job-location')
      const jobId = slugFromUrl(sourceUrl)

      if (!title || !jobId || !city) return null

      return {
        title,
        company: 'ASIP Technologies',
        department,
        location: `${city}, India`,
        city,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter(Boolean)
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html,application/xhtml+xml' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createAsipTechnologiesScraper = () => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const listings = extractListings(await fetchText(CAREERS_PAGE_URL))

    return Promise.all(listings.map(async (listing) => {
      const detailHtml = await fetchText(listing.sourceUrl)
      const detailDescription = extractDescription(detailHtml)
      const detailType = extractField(detailHtml, 'Job Type')
      const detailDepartment = extractField(detailHtml, 'Job Category')
      const detailCity = extractField(detailHtml, 'Job Location')

      return {
        ...listing,
        department: detailDepartment || listing.department,
        employmentType: detailType || listing.employmentType,
        location: detailCity ? `${detailCity}, India` : listing.location,
        city: detailCity || listing.city,
        jobDescription: detailDescription,
        link: listing.applyUrl,
        source: 'asiptechnologies',
        scrapedAt: new Date().toISOString(),
      }
    }))
  },
})

export const run = async (options = {}) => createAsipTechnologiesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  console.log(`Total ASIP Technologies jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'asiptechnologies')
}
