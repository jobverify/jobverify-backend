import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {extractOfficialRecruitmentLinks} from '../../scripts/officialRecruitmentLinks.js'
import {validateNativeInventory,validateNativeDetail} from './nativeContract.js'
import {hasNativeBoardIdentity} from './nativeContent.js'

import { NAVI_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NAVI_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const TURBOHIRE_BOARD_URL = PROVIDER_METADATA.handoffBoardUrl
export const ORIGIN = 'https://navi.turbohire.co'
export const ORG_ID = PROVIDER_METADATA.turboHireOrgId
export const API_BASE_URL = 'https://thapi.azurewebsites.net'
export const NOAUTH_TOKEN_URL = `${API_BASE_URL}/api/token/noauth`
export const FILTERED_JOBS_URL = `${API_BASE_URL}/api/careerpagev2/filteredjobs?orgId=${ORG_ID}&pageType=0`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const LIVE_FILTER_BODY = {
  SortByV2: { Key: 'PostedDate', Order: 2 },
  BunitIds: { Value: null, FilterType: 0 },
  Experience: { Value: null, FilterType: 0 },
  JobTypes: { Value: null, FilterType: 0 },
  JobTypeV2: { Value: null, FilterType: 0 },
  Locations: { Value: null, FilterType: 0 },
  CreatedDate: { Value: null, FilterType: 0 },
  Compensation: { Value: null, FilterType: 0 },
  Skills: { Value: null, FilterType: 0 },
  Keyword: '',
  ClientIds: { Value: null, FilterType: 0 },
  Department: '',
  CustomFields: {},
}

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

const parseLocations = (value) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const extractPrimaryLocation = (value) => normalizeWhitespace(parseLocations(value).find(p=>typeof p?.Address==='string'&&/,\s*India\s*$/i.test(p.Address))?.Address)

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0]) || null

const formatExperience = (experience = {}) => {
  const min = Number.isFinite(experience?.MinExp) ? experience.MinExp : null
  const max = Number.isFinite(experience?.MaxExp) ? experience.MaxExp : null

  if (min != null && max != null) {
    if (min === max) return `${min} year${min === 1 ? '' : 's'}`
    return `${min}-${max} years`
  }

  if (min != null) return `${min}+ years`
  if (max != null) return `Up to ${max} years`
  return null
}

const inferExperienceFromDescription = (jobDescription) => {
  const normalizedDescription = normalizeWhitespace(jobDescription)
  if (!normalizedDescription) return null

  const experienceProfile = extractJobFilterSignals({
    description: normalizedDescription,
  })?.experienceProfile
  const evidence = normalizeWhitespace(experienceProfile?.evidence)
  if (!evidence || experienceProfile?.confidence !== 'high') {
    return null
  }

  return (
    experienceProfile.minimumYears === 0 && experienceProfile.maximumYears === 0
      ? 'No experience required'
      : evidence
  )
}

const buildPublicJobUrl = (jobIdObfuscated) =>
  jobIdObfuscated ? `${ORIGIN}/job/publicjobs/${jobIdObfuscated}` : null

const buildPublicHeaders = (accessToken = null) => {
  const headers = {
    Origin: ORIGIN,
    Referer: TURBOHIRE_BOARD_URL,
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
  }

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return headers
}

export const hasOfficialCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = stripTags(rawHtml) || ''

  return /<title[^>]*>\s*Careers At Navi \| Join Our Team\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Join us in simplifying finance for a billion people.')
    && /view open roles/i.test(normalized)
    && /https:\/\/navi\.turbohire\.co\/dashboardv2\?orgId=3e818601-0baa-429c-b6f8-4b21903ae0e6(?:&amp;|&)type=0/i.test(rawHtml)
}

export const extractTurboHireHandoffUrl = html => extractOfficialRecruitmentLinks(String(html??''),CAREERS_PAGE_URL).find(link=>link.href===TURBOHIRE_BOARD_URL)?.href || null

export const hasOfficialBoardSignal = hasNativeBoardIdentity

export const buildFilteredJobsRequestBody = () => JSON.stringify(LIVE_FILTER_BODY)

export const extractPublicJobs = (payload = {}) =>
  (Array.isArray(payload?.Result) ? payload.Result : [])
    .map((record) => {
      const title = normalizeWhitespace(record?.JobTitle)
      const location = extractPrimaryLocation(record?.Location)
      const sourceUrl = buildPublicJobUrl(normalizeWhitespace(record?.JobIdObfuscated))
      const orgId = normalizeWhitespace(record?.OrgDetails?.OrgID)
      const jobDescription = stripTags(record?.JobDescV2)

      if (!title || !location || !sourceUrl) return null
      if (!/\bindia\b/i.test(location)) return null
      if (orgId !== ORG_ID) return null

      return {
        title,
        company: COMPANY_NAME,
        department: normalizeWhitespace(record?.Department),
        location,
        city: extractCity(location),
        country: 'India',
        jobId: normalizeWhitespace(record?.JobId),
        requisitionId: normalizeWhitespace(record?.JobCode) || normalizeWhitespace(record?.JobId),
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(record?.JobTypeV2) || null,
        experienceRequired: formatExperience(record?.Experience) || inferExperienceFromDescription(jobDescription),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: Array.isArray(record?.Skills)
          ? record.Skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
          : [],
        postingDate: normalizeWhitespace(record?.PublishedDate),
        closingDate: normalizeWhitespace(record?.ExpiryDates?.CAREERPAGE),
        jobDescription,
        publicExperienceChecked: Boolean(jobDescription),
      }
    })
    .filter(Boolean)

const defaultFetchPage = async (url,{signal}={}) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal,
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = async (url,options={}) => {
 const response=await fetch(url,{method:options.method||'GET',headers:options.headers,body:options.body,signal:options.signal})
 if(response.status!==200||response.url!==url)throw new Error(`Navi native HTTP ${response.status} or unexpected redirect`)
 return response.json()
}

export const createNaviScraper = ({
  fetchPage = defaultFetchPage,
  fetchJson = defaultFetchJson,
  now = () => new Date().toISOString(),
  signal, maxJobs = 10000, detailConcurrency = 2, timeoutMs = 90000,
} = {}) => ({
  async run() {
    if(!Number.isInteger(maxJobs)||maxJobs<0||maxJobs>10000||!Number.isInteger(detailConcurrency)||detailConcurrency<1||detailConcurrency>3||!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>180000)throw new Error('Navi invalid configured limits')
    const controller=new AbortController(),abort=()=>controller.abort(signal?.reason),timer=setTimeout(()=>controller.abort(new Error('Navi source deadline exceeded')),timeoutMs)
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true})
    const request=async(fn,url,options={})=>{
      controller.signal.throwIfAborted();let listener
      const requestSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])
      try{return await Promise.race([Promise.resolve().then(()=>fn(url,{...options,signal:requestSignal})),new Promise((_,reject)=>{listener=()=>reject(requestSignal.reason);requestSignal.addEventListener('abort',listener,{once:true})})])}
      finally{requestSignal.removeEventListener('abort',listener)}
    }
    try {
    const careersPage = await request(fetchPage,CAREERS_PAGE_URL)
    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, CAREERS_PAGE_URL)
      || !hasOfficialCareersPageSignal(careersPage.html)
    ) {
      throw new Error('Navi verified official careers page changed materially')
    }

    const handoffUrl = extractTurboHireHandoffUrl(careersPage.html)
    if (!sameUrl(handoffUrl, TURBOHIRE_BOARD_URL)) {
      throw new Error('Navi verified official careers page no longer links to the verified TurboHire board')
    }

    const boardPage = await request(fetchPage,TURBOHIRE_BOARD_URL)
    if (
      boardPage.status !== 200
      || !sameUrl(boardPage.url, TURBOHIRE_BOARD_URL)
      || !hasOfficialBoardSignal(boardPage.html)
    ) {
      throw new Error('Navi verified TurboHire board changed materially')
    }

    const tokenPayload = await request(fetchJson,NOAUTH_TOKEN_URL, {
      method: 'GET',
      headers: buildPublicHeaders(),
    })

    if(typeof tokenPayload?.access_token!=='string'||!tokenPayload.access_token)throw new Error('Navi public anonymous token unavailable')
    const listOptions={
      method: 'POST',
      headers: {
        ...buildPublicHeaders(tokenPayload?.access_token),
        'Content-Type': 'application/json',
      },
      body: buildFilteredJobsRequestBody(),
    }
    const listingsPayload = await request(fetchJson,FILTERED_JOBS_URL,listOptions)

    const scrapedAt = now()

    const inventory=validateNativeInventory(listingsPayload,{now:scrapedAt}),selected=inventory.rows.filter(r=>r.scope.indiaLocations.length>0),capped=selected.slice(0,maxJobs),jobs=new Array(capped.length)
    let cursor=0
    await Promise.all(Array.from({length:Math.min(detailConcurrency,capped.length)},async()=>{
     while(cursor<capped.length){controller.signal.throwIfAborted();const index=cursor++,row=capped[index].record,url=`${API_BASE_URL}/api/publicjobs?jobId=${row.JobIdObfuscated}&fieldVisibility=None`
      const raw=await request(fetchJson,url,{headers:buildPublicHeaders(tokenPayload.access_token)})
      const detail=validateNativeDetail(raw,row,{now:scrapedAt}),location=detail.scope.indiaLocations[0]
      const mapped=extractPublicJobs({Result:[{...row,JobDescV2:detail.jobDescription,Location:JSON.stringify([{Address:location.address}]),JobTypeV2:raw.JobTypeV2,Experience:raw.Experience,Skills:raw.Skills}]})[0]
      if(!mapped)throw new Error('Navi validated native role could not be mapped')
      jobs[index]={...mapped,location:location.address,city:location.city,jobDescription:detail.jobDescription,postingDate:detail.postingDate,closingDate:detail.closingDate,sourceNativeClosingDate:detail.sourceNativeClosingDate,sourceClosingDateIsExact:detail.sourceClosingDateIsExact,sourceDetailComplete:detail.sourceDetailComplete,sourceDetailStatus:detail.sourceDetailStatus,sourceDescriptionAttachment:detail.sourceDescriptionAttachment,sourceNativeLocations:detail.scope.locations,sourcePrimaryLocation:detail.scope.locations[0].address,source:SOURCE,link:mapped.applyUrl,scrapedAt,publicExperienceChecked:detail.sourceDetailComplete}
     }
    }))
    const final=validateNativeInventory(await request(fetchJson,FILTERED_JOBS_URL,listOptions),{now:scrapedAt})
    if(final.total!==inventory.total||final.snapshot!==inventory.snapshot)throw new Error('Navi native inventory changed during detail validation')
    const listingComplete=capped.length===selected.length,healthy=jobs.every(j=>j.sourceDetailComplete)
    jobs.forEach(j=>{j.sourceListingComplete=listingComplete})
    return attachInventoryEvidence(jobs,{status:listingComplete?(inventory.total?'complete-inventory':'verified-empty'):'discovery-only',surface:TURBOHIRE_BOARD_URL,firstParty:true,listingComplete,pagesFetched:1,reportedTotal:inventory.total,indiaFacetCount:selected.length,verifiedAt:now(),reason:listingComplete?(healthy?'complete-public-inventory-and-full-native-details':'complete-public-inventory-with-missing-native-details'):'configured-cap-incomplete'})
    }finally{controller.abort();clearTimeout(timer);signal?.removeEventListener('abort',abort)}
  },
})

export const run = async (options = {}) => createNaviScraper(options).run()

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
