import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeGreenhouseSourceRoleUrl } from '../../scraper-support/utils/greenhouseSourceEvidence.js'
import { hasNativeIndiaLocation, selectGreenhouseLocation } from '../../scraper-support/utils/greenhouseLocations.js'

import { SIGMA_COMPUTING_CATALOG } from './catalog.js'
import {retainSigmaNativeRecords} from './nativeRecords.js'
import {createPublishingGapAtsScraper} from '../../scraper-support/utils/publishingGapAts.js'
import {attachInventoryEvidence,readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {readNativeDocument} from '../../scraper-support/utils/activeNativeHtml.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SIGMA_COMPUTING_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const GREENHOUSE_BOARD_URL = PROVIDER_METADATA.greenhouseBoardUrl
export const GREENHOUSE_JOBS_API_URL = PROVIDER_METADATA.greenhouseJobsApiUrl
export const extractNativeJobsFromGreenhousePayload = retainSigmaNativeRecords

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtml = (value) => normalizeWhitespace(value)

const collectLocationValues = (job = {}) => [
  normalizeWhitespace(job?.location?.name),
  ...(Array.isArray(job?.offices)
    ? job.offices.map((office) => normalizeWhitespace(office?.location || office?.name))
    : []),
  ...(Array.isArray(job?.metadata)
    ? job.metadata.map((entry) => normalizeWhitespace(entry?.value))
    : []),
].filter(Boolean)

const hasIndiaMarker = (value) => /\bindia\b/i.test(String(value ?? ''))

const inferCity = (location) => {
  const firstToken = normalizeWhitespace(location)?.split(',')[0]?.trim()
  if (!firstToken || /^india$/i.test(firstToken)) return null
  return firstToken
}

const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
  signal,
})

const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, {
  method: 'GET',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: CAREERS_URL,
  },
  label: SOURCE,
  timeoutMs: 15000,
  signal,
})

export const buildGreenhouseJobsApiUrl = () => `${GREENHOUSE_JOBS_API_URL}?content=true`

export const normalizeGreenhouseJobUrl = (value, jobId) => {
  return normalizeGreenhouseSourceRoleUrl(value, { jobId, boardToken: 'sigmacomputing', companyCareerPage: CAREERS_URL })
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  return /<title>\s*Careers and Open Positions\s*\|\s*Sigma\s*<\/title>/i.test(page)
    && normalized.includes('Careers at Sigma')
    && normalized.includes('View open positions')
    && /job-boards\.greenhouse\.io\/sigmacomputing\/jobs\//i.test(page)
}

export const extractIndiaJobsFromGreenhousePayload = (payload,{scrapedAt=new Date().toISOString()}={}) =>
  retainSigmaNativeRecords(payload,{scrapedAt}).flatMap(job=>{
    const raw=job.sourceNativeRecord,location=selectGreenhouseLocation(raw)
    if(!hasNativeIndiaLocation(location))return []
    return [{...job,location,city:inferCity(location),country:'India',requisitionId:normalizeWhitespace(raw.requisition_id),department:normalizeWhitespace(raw.departments?.[0]?.name),experienceRequired:null,minimumQualification:null,preferredQualification:null,requiredSkills:[],closingDate:null}]
  })

export const createSigmaComputingScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
    signal,
    onAudit,
  } = {}) {
    signal?.throwIfAborted()
    const careersHtml = await fetchText(CAREERS_URL, { signal })
    signal?.throwIfAborted()
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Sigma Computing verified official careers page no longer matches the trusted public surface')
    }

    const payload = await fetchJson(buildGreenhouseJobsApiUrl(), { signal })
    signal?.throwIfAborted()
    const nativeRecords=retainSigmaNativeRecords(payload,{scrapedAt:now()}),nativeById=new Map(nativeRecords.map(row=>[row.jobId,row]))
    // Preserve the previous source's advertised-role reconciliation diagnostic.
    // It does not prove that the publisher's scripts/styles/hiring scope closes.
    const document=readNativeDocument(careersHtml),employerAdvertisedRoleIds=[...new Set(document.nodes(node=>node.tag==='a'&&node.attrs.href).flatMap(node=>{
      try{const url=new URL(node.attrs.href,CAREERS_URL);return url.origin==='https://job-boards.greenhouse.io'?url.pathname.match(/^\/sigmacomputing\/jobs\/(\d+)\/?$/)?.slice(1)||[]:[]}catch{return []}
    }))].sort(),unreconciledEmployerRoleIds=employerAdvertisedRoleIds.filter(id=>!nativeById.has(id))
    // Pass the original COMPLETE envelope to the CURRENT strongest GH engine.
    // Enrichment never replaces its country/detail/identity/date/content proof.
    const strong=await createPublishingGapAtsScraper({...PROVIDER_METADATA,boardToken:'sigmacomputing',sourceScopeComplete:false,lifecycleCleanupAllowed:false}).run({fetchJson:async url=>{if(url!==buildGreenhouseJobsApiUrl())throw Error('Unexpected Sigma native endpoint');return payload},signal})
    signal?.throwIfAborted()
    const strongestEngineEvidence=readInventoryEvidence(strong),jobs=strong.map(job=>{
      const native=nativeById.get(String(job.jobId));if(!native)throw Error('Sigma strongest engine returned unknown native identity')
      const {sourceFirstPublished,sourceUpdatedAt,sourceNativeEducation,sourceNativeMetadata,sourceNativeRecord,sourceNativeContent,sourceNativeRequisitionId,sourceCriteriaIssues,sourceCriteriaSchemaKnown,sourcePublisher,legalHiringEmployer}=native
      return {...job,sourceFirstPublished,sourceUpdatedAt,sourceNativeEducation,sourceNativeMetadata,sourceNativeRecord,sourceNativeContent,sourceNativeRequisitionId,sourceCriteriaIssues,sourceCriteriaSchemaKnown,sourcePublisher,legalHiringEmployer,sourceScopeComplete:false,lifecycleCleanupAllowed:false}
    })
    const audit={source:SOURCE,productionWrites:false,currentLiveQualification:false,sourceScopeComplete:false,lifecycleCleanupAllowed:false,authoritativeSourceTotal:null,authoritativeIndiaFacetCount:null,observedNativeBoardCount:payload.jobs.length,originalNativePayload:structuredClone(payload),nativeRecords,strongestEngineEvidence,employerAdvertisedRoleIds,unreconciledEmployerRoleIds,noClosingCaptureClaimed:true,missingProofs:['current active corporate renderer/programs/styles and all hiring channels','all role-owned country alternatives and public full native detail/schema','fresh opening/closing global inventory']}
    Object.defineProperty(jobs,'sourceAudit',{value:audit});onAudit?.(structuredClone(audit));signal?.throwIfAborted()
    return attachInventoryEvidence(jobs,{...strongestEngineEvidence,status:'discovery-only',listingComplete:false,reportedTotal:null,indiaFacetCount:null,reason:'sigma-native-criteria-retained-source-scope-unresolved:'+strongestEngineEvidence.reason+(unreconciledEmployerRoleIds.length?';official-role-links-not-reconciled':'')})
  },
})

export const run = async (options = {}) => createSigmaComputingScraper().run(options)

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
