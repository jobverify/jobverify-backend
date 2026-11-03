import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {readCdotAdvertisement} from './nativeAdvertisement.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CURRENT_OPENINGS_URL = 'https://cdot.in/cdotweb/web/current_openings.php?lang=en'
export const SOURCE = 'cdot'
const COMPANY = 'Centre for Development of Telematics (C-DOT)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '')
  .replace(/<br\b[^>]*>/gi, ' ')
  .replace(/<[^>]+>/g, ' '))

const extractHref = (html) => html.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2] || null

const parseDate = (value) => {
  const match = normalizeWhitespace(value)?.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (!match) return null

  const [, day, month, year] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString()
}

const extractRows = (html) => {
  const table = String(html ?? '').match(/<table\b[^>]*\bid\s*=\s*(["'])openings\1[^>]*>[\s\S]*?<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)
  if (!table) return []

  return [...table[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => [...match[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((cell) => cell[1]))
    .filter((cells) => cells.length >= 6)
}

const getJobId = (applyUrl, rowNumber) => {
  try {
    const advertisementId = new URL(applyUrl).searchParams.get('adv_id')
    if (advertisementId) return `cdot-${advertisementId}`
  } catch {
    // Keep parsing a row even if C-DOT changes the application URL format.
  }

  return `cdot-${rowNumber}`
}

export const hasCurrentOpeningsSignal = (html) => (
  /<title>\s*Current Openings\s*<\/title>/i.test(String(html ?? ''))
  && /<table\b[^>]*\bid\s*=\s*(["'])openings\1/i.test(String(html ?? ''))
)

export const extractOpenings = (html) => extractRows(html)
  .map((cells) => {
    const rowNumber = stripTags(cells[0])
    const title = stripTags(cells[1])
    const advertisementUrl = extractHref(cells[4])
    const applicationUrl = extractHref(cells[5])
    const applyUrl = applicationUrl ? new URL(applicationUrl, CURRENT_OPENINGS_URL).toString() : null

    if (!title || !applyUrl) return null

    const jobId = getJobId(applyUrl, rowNumber || title)
    return {
      title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: advertisementUrl
        ? new URL(advertisementUrl, CURRENT_OPENINGS_URL).toString()
        : CURRENT_OPENINGS_URL,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: parseDate(stripTags(cells[2])),
      closingDate: parseDate(stripTags(cells[3])),
      jobDescription: null,
    }
  })
  .filter(Boolean)

const defaultFetchText = (url,{signal}={}) => fetchTextWithRetry(url, {
  signal,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})
const defaultFetchBinary=async(url,{signal}={})=>{
  const parsed=new URL(url)
  if(parsed.origin!=='https://cdot.in'||!parsed.pathname.startsWith('/cdotweb/assets/docs/curr_openings/adv/')||!parsed.pathname.endsWith('.pdf'))throw Error('C-DOT native: advertisement URL is outside the official surface')
  const response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000),redirect:'error'})
  if(response.status!==200||response.url!==url||!/application\/pdf/i.test(response.headers.get('content-type')||''))throw Error('C-DOT native: advertised PDF response changed')
  return Buffer.from(await response.arrayBuffer())
}

export const createCdotScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText,fetchBinary=defaultFetchBinary,signal } = {}) {
    signal?.throwIfAborted()
    const html = await fetchText(CURRENT_OPENINGS_URL,{signal})
    signal?.throwIfAborted()
    if (!hasCurrentOpeningsSignal(html)) {
      throw new Error('C-DOT current openings page no longer exposes the expected table')
    }

    const listings = extractOpenings(html),jobs=[]
    if(!listings.length||new Set(listings.map(job=>job.jobId)).size!==listings.length)throw Error('C-DOT native: current vacancy identity inventory is unavailable')
    for(const listing of listings){signal?.throwIfAborted();jobs.push(await readCdotAdvertisement(await fetchBinary(listing.sourceUrl,{signal}),listing,{signal}))}
    const closing=await fetchText(CURRENT_OPENINGS_URL,{signal})
    signal?.throwIfAborted()
    if(!hasCurrentOpeningsSignal(closing)||JSON.stringify(extractOpenings(closing))!==JSON.stringify(listings))throw Error('C-DOT native: closing advertised vacancy identities changed')
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs
    const complete=selectedJobs.length===jobs.length
    return attachInventoryEvidence(selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
      sourceListingComplete:complete,
      lifecycleCleanupAllowed:complete,
    })),{status:complete?'complete-inventory':'coverage-gap',surface:CURRENT_OPENINGS_URL,firstParty:true,listingComplete:complete,
      pagesFetched:2+jobs.length,reportedTotal:listings.length,indiaFacetCount:jobs.length,verifiedAt:new Date().toISOString(),
      reason:'Declared official C-DOT current-openings table and closing identities reconciled; complete bound native PDF criteria and domestic role workplace verified'})
  },
})

export const run = async (options={}) => createCdotScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running C-DOT scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
