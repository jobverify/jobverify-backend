import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import { nativeCountryName, nativeLocationCountryName } from '../../scraper-support/shared/nativeJobPosting.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const JOBS_API_URL = 'https://ammachilabs.org/wp-json/wp/v2/jobs?per_page=100&page=1'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toIsoDate = (value, { assumeUtc = false } = {}) => {
  if (!value) return null

  const normalizedValue = assumeUtc && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(String(value))
    ? `${value}Z`
    : value

  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const inferEmploymentType = (value) => {
  const code = Array.isArray(value) ? value[0] : value
  switch (String(code || '').toUpperCase()) {
    case 'FULL_TIME':
      return 'Full-time'
    case 'PART_TIME':
      return null
    case 'CONTRACTOR':
      return 'Contract'
    case 'TEMPORARY':
      return 'Temporary'
    case 'INTERN':
    case 'INTERNSHIP':
      return 'Internship'
    default:
      return normalizeWhitespace(code)
  }
}

const inferLocationFromTitle = (title) => {
  const normalizedTitle = normalizeWhitespace(title)
  if (!normalizedTitle) return null

  const match = normalizedTitle.match(/\bin\s+(.+\b(?:district|city),\s*[A-Za-z][A-Za-z ]+)$/i)
  return normalizeWhitespace(match?.[1])
}

const explicitLocationCountry = (value) => {
  if (!value) return null
  const parts = value.split(',').map(part => part.trim())
  const countries = parts.filter(part => part.length > 2).map(nativeCountryName).filter(Boolean)
  if (new Set(countries).size > 1) throw Object.assign(Error('Ammachi native role country conflict'), {abortRetries:true})
  // The CMS field is a workplace label, not a typed ISO-country field.
  return parts.at(-1).length > 2 ? nativeLocationCountryName(value) : null
}

const inferRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return null
  if (normalized.includes('hybrid')) return 'Hybrid'
  if (normalized.includes('remote')) return 'Remote'
  return 'On-site'
}

const appendSection = (parts, title, value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return

  if (title) {
    parts.push(`${title} ${normalized}`)
    return
  }

  parts.push(normalized)
}

export const buildSearchUrl = () => JOBS_API_URL

export const extractSearchResults = (records = []) => {
  if (!Array.isArray(records)) throw Error('Ammachi native jobs array missing')
  const seen = new Set()
  return records.map((record) => {
    if (seen.has(String(record?.id))) throw Object.assign(Error('Ammachi duplicate native role identity'), {abortRetries:true})
    seen.add(String(record?.id))
    const title = normalizeWhitespace(record?.position_title)
      || normalizeWhitespace(record?.title?.rendered)
    const rawLocation = normalizeWhitespace(record?.position_job_location)
      || inferLocationFromTitle(title)
    const address=Object.fromEntries(['streetAddress','addressLocality','addressRegion','postalCode','addressCountry'].map(key=>{
      const value=record?.['position_job_location_'+key]
      if(value!=null&&typeof value!=='string')throw Error('Ammachi native workplace component type changed')
      return[key,normalizeWhitespace(value)]
    }))
    const labelCountry=explicitLocationCountry(rawLocation),addressCountry=address.addressCountry?nativeCountryName(address.addressCountry):null
    if(address.addressCountry&&!addressCountry||labelCountry&&addressCountry&&labelCountry!==addressCountry)throw Object.assign(Error('Ammachi native role country conflict'),{abortRetries:true})
    if(rawLocation&&address.addressLocality&&!rawLocation.split(',').map(value=>value.trim().toLowerCase()).includes(address.addressLocality.toLowerCase()))throw Object.assign(Error('Ammachi native role locality conflict'),{abortRetries:true})
    const country=labelCountry||addressCountry
    const componentLabel=[address.streetAddress,address.addressLocality,address.addressRegion,address.postalCode,addressCountry].filter(Boolean).join(', ')||null
    const location=rawLocation||componentLabel
    const remoteStatus=rawLocation?inferRemoteStatus(rawLocation):null
    const city = !rawLocation ? address.addressLocality : remoteStatus === 'Remote' || country && nativeCountryName(location) === country
      || /[;&|]|\b(?:across|multiple locations|worldwide|global)\b/i.test(location || '')
      ? null
      : normalizeWhitespace(rawLocation)?.split(',')[0]?.trim() || null

    const jobDescriptionParts = []
    appendSection(jobDescriptionParts, '', record?.position_description)
    appendSection(jobDescriptionParts, 'Responsibilities', record?.position_responsibilities)
    appendSection(jobDescriptionParts, 'Qualifications', record?.position_qualifications)

    return {
      title,
      company: 'Ammachi Labs',
      department: null,
      location,
      city,
      country,
      jobId: String(record?.id ?? ''),
      requisitionId: String(record?.id ?? ''),
      sourceUrl: normalizeWhitespace(record?.link),
      applyUrl: normalizeWhitespace(record?.link),
      employmentType: inferEmploymentType(record?.position_employment_type),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: record?.date_gmt
        ? toIsoDate(record.date_gmt, { assumeUtc: true })
        : toIsoDate(record?.date),
      closingDate: null,
      jobDescription: normalizeWhitespace(jobDescriptionParts.join(' ')),
      remoteStatus,
    }
  }).filter((job) => job.title && job.jobId && job.sourceUrl)
}

const defaultFetchJson = (url, {signal} = {}) => fetchJsonWithRetry(url, {
  signal,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: 'ammachilabs',
  timeoutMs: 15000,
})

export const createAmmachiLabsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    options.signal?.throwIfAborted()
    const fetchJson = options.fetchJson || defaultFetchJson
    const records = await fetchJson(buildSearchUrl(), {signal:options.signal})
    options.signal?.throwIfAborted()
    const jobs = extractSearchResults(records)
    const selectedJobs = maxJobs == null ? jobs : jobs.slice(0, maxJobs)
    const byId = new Map(records.map(record => [String(record.id), record]))
    const scrapedAt = new Date(typeof options.now === 'function' ? options.now() : options.now || new Date()).toISOString()

    const result = selectedJobs.map((job) => ({
      ...job,
      source: 'ammachilabs',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
      sourceListingComplete:false,sourceScopeComplete:false,lifecycleCleanupAllowed:false,
      sourceDetailComplete:Boolean(job.jobDescription),
      nativeLocationEvidence:{positionJobLocation:byId.get(job.jobId).position_job_location??null,
        positionJobLocationComponents:Object.fromEntries(['streetAddress','addressLocality','addressRegion','postalCode','addressCountry','remote'].map(key=>[key,byId.get(job.jobId)['position_job_location_'+key]??null])),
        roleTitleLocation:inferLocationFromTitle(job.title),countryQualified:Boolean(job.country),
        reason:job.country?'explicit-country-in-role-workplace':'native-role-country-unknown'},
      nativePublicationDateRaw:byId.get(job.jobId).date_gmt??byId.get(job.jobId).date??null,
      nativeRoleDescriptionSections:Object.fromEntries(['position_description','position_responsibilities','position_qualifications'].map(key=>[key,byId.get(job.jobId)[key]??null])),
    }))
    const audit={source:'ammachilabs',observedListingCount:records.length,reportedTotal:null,indiaFacetCount:null,
      candidateDetails:records.length,extractedDetailJobs:result.filter(job=>job.sourceDetailComplete).length,excludedDetailJobs:0,
      failures:result.filter(job=>!job.sourceDetailComplete).map(job=>({stage:'native-detail',nativeRoleId:job.jobId,kind:'missing-content'})),
      listingPaginationComplete:null,closingInventoryMatches:null,sourceScopeComplete:false,nativeObservedRecordCount:records.length,
      nativeMissingWorkplaceCount:jobs.filter(job=>!job.location).length,nativeExplicitCountryCount:jobs.filter(job=>job.country).length,
      authoritativeTotalUnknown:true,reason:'One public WordPress page; pagination headers, current closing cohort and missing role workplace countries remain unverified.'}
    if(result.length)result[0].nativeCollectionEvidence=audit
    Object.defineProperty(result,'nativeCollectionEvidence',{value:audit})
    return attachInventoryEvidence(result,{status:'coverage-gap',surface:JOBS_API_URL,firstParty:true,listingComplete:false,
      pagesFetched:1,reportedTotal:null,indiaFacetCount:null,verifiedAt:scrapedAt,
      reason:'Native role workplace labels retained without employer-address, travel or country inference. '+records.length+' records observed; '+jobs.filter(job=>!job.location).length+' workplaces absent. Full inventory and country scope remain unknown.'})
  },
})

export const run = async (options = {}) => createAmmachiLabsScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Ammachi Labs scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'ammachilabs')
    console.log('DB result:', result)
    process.exit(0)
  }
}
