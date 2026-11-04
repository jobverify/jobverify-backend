import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { IXIGO_CATALOG } from './catalog.js'
import {extractActiveDescription} from '../../scraper-support/utils/activeNativeHtml.js'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = IXIGO_CATALOG.source
export const COMPANY = IXIGO_CATALOG.companyName
export const PROVIDER_METADATA = IXIGO_CATALOG
export const HOMEPAGE_URL = IXIGO_CATALOG.homepageUrl
export const LEGACY_CAREERS_URL = IXIGO_CATALOG.legacyCareersUrl
export const CURRENT_CAREERS_URL = IXIGO_CATALOG.currentCareersUrl
export const OPENINGS_API_URL = 'https://careers.ixigo.com/api/openings'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|section|article|a)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    return url.toString()
  } catch {
    return String(value ?? '')
  }
}

const defaultFetchPage = async (url, {signal} = {}) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'error', credentials: 'omit',
    signal: AbortSignal.any([signal,AbortSignal.timeout(20000)].filter(Boolean)),
  })

  const chunks=[];let size=0
  for await(const chunk of response.body){size+=chunk.byteLength;if(size>4e6)throw Error('ixigo native response body limit');chunks.push(chunk)}

  return {
    status: response.status,
    url: response.url,
    html: Buffer.concat(chunks).toString('utf8'),
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*ixigo careers\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Join our team of 250+ passionate folks')
    && normalized.includes('we are changing the way India travels.')
    && normalized.includes('Open roles')
}

export const hasVerifiedNoJobsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html) || ''

  return normalized.includes('No Jobs Found')
    && normalized.includes('Could not find an open position that excites you ?')
    && normalized.includes('Apply for Another Position')
}

const verifyCurrentCareersPage = (page) => {
  if (page.status !== 200 || normalizeComparableUrl(page.url) !== normalizeComparableUrl(CURRENT_CAREERS_URL)) {
    throw new Error(`ixigo current careers page returned HTTP ${page.status} or an unexpected redirect`)
  }

  if (!hasOfficialCareersSignal(page.html)) {
    throw new Error('The official ixigo careers page no longer matches the verified first-party surface')
  }

}

const extractOpenings = (payload) => {
  const data = payload?.data
  if (!Array.isArray(data?.results) || !Number.isInteger(data.numFound)
    || data.numFound < 0 || data.results.length !== data.numFound) {
    throw new Error('ixigo openings API returned an incomplete listing')
  }
  const seen = new Set()
  const jobs = []
  for (const record of data.results) {
    const jobId = String(record?.jobVacancyId || '')
    const title = normalizeWhitespace(record?.vacancyName)
    const location = normalizeWhitespace(record?.location)
    const countryCode = String(record?.countryAbbreviation || '').toLowerCase()
    if (!/^\d+$/.test(jobId) || !title || !location || !/^[a-z]{2}$/.test(countryCode)
      || record?.companyIdentifier?.toLowerCase() !== 'ixigo'
      || record?.companyName?.toLowerCase() !== 'ixigo' || seen.has(jobId)) {
      throw new Error('ixigo openings API returned an invalid or duplicate company job record')
    }
    seen.add(jobId)
    if (countryCode !== 'in') continue
    if (String(record.countryName || '').toLowerCase() !== 'india') {
      throw new Error('ixigo openings API returned inconsistent country evidence')
    }
    // This is the SmartRecruiters handoff used by the official careers app,
    // with the canonical host verified after its www.smartrecruiters.com redirect.
    const link = `https://jobs.smartrecruiters.com/ixigo/${jobId}`
    const postingDate = new Date(record.releasedDate)
    jobs.push({
      title, company: COMPANY, location, city: location.split(',')[0].trim(), country: 'India',
      link, applyUrl: link, sourceUrl: link, source: SOURCE, jobId,
      requisitionId: record.refNumber || jobId, department: record.department || null,
      employmentType: record.typeOfEmployment || null, jobDescription: null,
      postingDate: record.releasedDate && Number.isFinite(postingDate.getTime()) ? postingDate.toISOString() : null,
      remoteStatus: record.locationRemote ? 'Remote' : record.locationHybrid ? 'Hybrid' : 'On-site',
      atsPlatform: 'smartrecruiters',
      nativeListingRecord: record,
    })
  }
  return jobs
}

export const createIxigoScraper = () => ({
  async run({ fetchPage = defaultFetchPage, signal } = {}) {
    signal?.throwIfAborted()
    const currentCareersPage = await fetchPage(CURRENT_CAREERS_URL,{signal})
    verifyCurrentCareersPage(currentCareersPage)
    // The exported HTML says No Jobs Found before its client request completes,
    // and even after request errors. Only the API establishes the vacancy set.
    const response = await fetchPage(OPENINGS_API_URL,{signal})
    if (response.status !== 200 || normalizeComparableUrl(response.url) !== OPENINGS_API_URL) {
      throw new Error(`ixigo openings API returned HTTP ${response.status} or an unexpected redirect`)
    }
    let payload
    try { payload = JSON.parse(response.html) } catch {
      throw new Error('Could not parse ixigo openings API response')
    }
    const candidates=extractOpenings(payload),jobs=[],observed={source:SOURCE,observedAt:new Date().toISOString(),
      returnedIndiaJobs:0,nativeRecords:candidates.length,unresolved:[],exclusions:[],failures:[],
      nativeInventoryReads:[{kind:'ixigo-first-party-openings',surface:OPENINGS_API_URL,reportedTotal:payload.data.numFound}],
      sourceScopeComplete:false,lifecycleCleanupAllowed:false}
    for(const candidate of candidates.slice(0,50)){
      signal?.throwIfAborted()
      const endpoint='https://api.smartrecruiters.com/v1/companies/ixigo/postings/'+candidate.jobId
      try{
        const page=await fetchPage(endpoint,{signal})
        if(page.status!==200||page.url!==endpoint)throw Error('ixigo native detail HTTP '+page.status+' or changed response URL')
        const detail=JSON.parse(page.html)
        if(detail.id!==candidate.jobId||normalizeWhitespace(detail.name)!==candidate.title||detail.refNumber!==candidate.requisitionId
          ||detail.company?.name?.toLowerCase()!=='ixigo'||detail.company?.identifier?.toLowerCase()!=='ixigo')throw Error('ixigo native detail role or company identity changed')
        if(detail.active!==true||detail.visibility!=='PUBLIC'){
          observed.exclusions.push({reason:'native-role-not-active-public',id:candidate.jobId});continue
        }
        if(detail.location?.country?.toLowerCase()!=='in')throw Error('ixigo native detail country is unavailable or conflicts with its listing')
        const sections=detail.jobAd?.sections,ownDescription=extractActiveDescription(sections?.jobDescription?.text)
        if(!ownDescription||ownDescription.length<100)throw Error('ixigo native full role description unavailable')
        const description=['companyDescription','jobDescription','qualifications','additionalInformation'].map(key=>sections[key]?.text).filter(text=>typeof text==='string'&&text.trim()).join('\n')
        const role=new URL(detail.postingUrl),application=new URL(detail.applyUrl)
        const publicRole=url=>url.protocol==='https:'&&url.hostname==='jobs.smartrecruiters.com'&&!url.username&&!url.password&&!url.port&&!url.hash
          &&/^\/ixigo\/\d+(?:-[^/]+)?$/.test(url.pathname)
        if(!publicRole(role)||role.search||!publicRole(application)||role.pathname!==application.pathname)throw Error('ixigo native public role URL changed publisher or identity')
        jobs.push({...candidate,link:role.href,sourceUrl:role.href,applyUrl:application.href,jobDescription:description,sourceDescription:description,
          nativeHiringOrganization:detail.company,nativeSourceRecord:{listing:candidate.nativeListingRecord,detail},
          sourceDetailComplete:true,sourceScopeComplete:false,sourceListingComplete:false,lifecycleCleanupAllowed:false,applicationVisited:false})
      }catch(error){
        signal?.throwIfAborted()
        observed.unresolved.push('native-role-detail-unverified')
        observed.failures.push({stage:'native-ixigo-role-detail',id:candidate.jobId,message:error.message})
        if(/\bHTTP (?:401|403|429|451)\b/.test(error.message))break
      }
    }
    if(candidates.length>50)observed.unresolved.push('native-detail-budget-reached')
    observed.returnedIndiaJobs=jobs.length
    if(candidates.length&&!jobs.length&&observed.failures.length){
      const error=Object.assign(Error('ixigo native role details unavailable'),{failureKind:'coverage_gap',softFailure:true,recruitmentObservations:observed})
      throw error
    }
    Object.defineProperty(jobs,Symbol.for('jobverify.verified-recruitment-observations'),{value:observed})
    return attachInventoryEvidence(jobs,{status:'coverage-gap',surface:CURRENT_CAREERS_URL,firstParty:true,listingComplete:false,
      pagesFetched:2+Math.min(candidates.length,50),reportedTotal:payload.data.numFound,indiaFacetCount:candidates.length,
      verifiedAt:observed.observedAt,reason:'first-party-openings-and-matching-active-public-native-details;source-scope-unverified;cleanup-forbidden'})
  },
})

export const run = async (options = {}) => createIxigoScraper().run(options)

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
