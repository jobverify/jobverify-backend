import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPhenomScraper } from '../../scraper-support/phenom/engine.js'
import { fetchTextWithRetry, fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import { attachInventoryEvidence, readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { decodeNativeEntities, extractActiveDescription } from '../../scraper-support/utils/activeNativeHtml.js'
import { incomplete, readNativePage } from './native.js'

const currentDir=path.dirname(fileURLToPath(import.meta.url))
export const SOURCE='abbott', COMPANY='Abbott', BASE_URL='https://www.jobs.abbott', SEARCH_PATH='/us/en/search-results'
const MAIN_DESCRIPTION_VIEWS=new Set(['997-prod','995-prod','22','998-prod','1223-prod','1236-prod','1231-prod','1233-prod'].map(page=>'job-nav-ABLAUS-en_us-page'+page))
const shared=createPhenomScraper({companyName:COMPANY,source:SOURCE,baseUrl:BASE_URL,searchPath:SEARCH_PATH,scraperDir:currentDir})
const text = x => typeof x==='string'?x.normalize('NFC').replace(/\s+/g,' ').trim():null
const equal = (a,b) => text(a)===text(b)
const countryNames=new Map(),displayCountry=new Intl.DisplayNames(['en'],{type:'region'})
for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){
  const code=String.fromCharCode(a,b),name=displayCountry.of(code)
  if(name!==code&&!['ZZ','EU','EZ','UN','XA','XB','QO'].includes(code)){countryNames.set(code.toLowerCase(),code);countryNames.set(name.toLowerCase(),code)}
}
for(const [name,code] of [['Korea, Republic of','KR'],['Saint Lucia','LC'],['United States of America','US']])countryNames.set(name.toLowerCase(),code)
const countryCode = value => typeof value==='string'?countryNames.get(text(value).toLowerCase())??null:null
const india = value => countryCode(value)==='IN'
const joined = parts => parts.map(text).filter(Boolean).join(', ')
const externalVisibility = value => Array.isArray(value)&&value.every(item=>typeof item==='string')&&value.includes('external')
const budget = (x,fallback) => Number.isFinite(Number(x))&&Number(x)>=0?Number(x):fallback
const hasUpstreamError = value => {
  if(typeof value==='string')return value.trim().length>0
  if(Array.isArray(value))return value.length>0
  if(value&&typeof value==='object')return Object.keys(value).length>0
  return Boolean(value)
}
const nativeDate = raw => {
  if(raw==null||raw==='')return {state:'unknown',raw,precision:null}
  if(typeof raw!=='string')return {state:'invalid',raw,precision:null}
  const m=/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:?\d{2}))?$/.exec(raw)
  if(!m)return {state:'invalid',raw,precision:null}
  const day=raw.slice(0,10),calendar=new Date(day+'T00:00:00Z')
  if(!Number.isFinite(calendar.getTime())||calendar.toISOString().slice(0,10)!==day
    ||m[4]!=null&&(Number(m[4])>23||Number(m[5])>59||Number(m[6]||0)>59))return {state:'invalid',raw,precision:null}
  const timestamp=Date.parse(raw)
  return Number.isFinite(timestamp)?{state:'valid',raw,timestamp,precision:m[4]==null?'utc-day':'timestamp'}:{state:'invalid',raw,precision:null}
}
const publication = (listing,job,posting) => {
  const fields={listingPostedDate:listing.postedDate??null,detailPostedDate:job?.postedDate??null,jsonLdDatePosted:posting?.datePosted??null}
  const parsed=Object.values(fields).map(nativeDate),invalid=parsed.some(p=>p.state==='invalid')
  const candidates=parsed.filter(p=>p.state==='valid').sort((a,b)=>a.timestamp-b.timestamp)
  return {value:invalid?null:candidates[0]?.raw??null,valid:!invalid,evidence:{...fields,
    dateCreated:job?.dateCreated??null,jobUpdatedDate:job?.jobUpdatedDate??null,
    selection:'earliest-valid-native-publication-field-without-creation-or-crawl-time',
    reconciliation:invalid?'invalid':candidates.length?'reconciled':'unknown',
    differingNativePublicationValues:new Set(candidates.map(p=>p.timestamp)).size>1,originalPublicationVerified:false}}
}
const closing = (listing,job,posting) => {
  const fields={jsonLdValidThrough:posting?.validThrough??null,detailValidThrough:job?.validThrough??null,
    detailExpiryDate:job?.expiryDate??null,detailClosingDate:job?.closingDate??null,
    listingValidThrough:listing.validThrough??null,listingExpiryDate:listing.expiryDate??null,listingClosingDate:listing.closingDate??null}
  const parsed=Object.values(fields).map(nativeDate),candidates=parsed.filter(p=>p.state==='valid')
  const malformed=parsed.some(p=>p.state==='invalid')
  const conflict=candidates.some(p=>p.timestamp!==candidates[0].timestamp||p.precision!==candidates[0].precision)
  return {value:malformed||conflict?null:candidates[0]?.raw??null,valid:!malformed&&!conflict,
    precision:malformed||conflict?'unverified':candidates[0]?.precision??'unknown',
    evidence:{...fields,reconciliation:malformed?'invalid':conflict?'conflicting':candidates.length?'reconciled':'unknown'}}
}
const validApply = (url,id) => {
  try{
    if(typeof url!=='string'||url.includes('\\'))return false
    const u=new URL(url)
    if(u.origin!=='https://abbott.wd5.myworkdayjobs.com'||u.username||u.password||u.search||u.hash
      ||/%(?:2f|5c)/i.test(u.pathname))return false
    decodeURIComponent(u.pathname)
    return new RegExp('^/abbottcareers/job/[A-Za-z0-9_-]+/[A-Za-z0-9][A-Za-z0-9._~%+-]*_'+id+'(?:-\\d+)?/apply$').test(u.pathname)
  }catch{return false}
}
const validCanonical = (value,id,sequence) => {
  try{
    if(typeof value!=='string'||value.includes('\\')||/\/(?:\.|%2e)(?:\.|%2e)?(?:\/|$)/i.test(value))return false
    const url=new URL(value),route=/^\/us\/en\/job\/([^/]+)(?:\/([^/]+))?$/.exec(url.pathname)
    if(url.origin!==BASE_URL||url.username||url.password||url.search||url.hash||!route
      ||![id,sequence].includes(route[1])||/%(?:2f|5c)/i.test(url.pathname))return false
    decodeURIComponent(url.pathname)
    return true
  }catch{return false}
}
const officeProof = (raw,job) => {
  const offices=job.multi_location
  if(!Array.isArray(offices)||!offices.length||!Array.isArray(raw.multi_location)||raw.multi_location.length!==offices.length)return null
  const seen=new Set()
  for(const o of offices){
    if(!o||typeof o!=='object'||Array.isArray(o)||![o.city,o.country,o.cityStateCountry,o.location].every(v=>typeof v==='string'&&v.trim())
      ||countryCode(o.country)!=='IN'||!equal(o.cityStateCountry,joined([o.city,o.state,o.country]))
      ||!raw.multi_location.includes(o.location)||seen.has(o.location))return null
    for(const [field,expected]of [[o.cityState,joined([o.city,o.state])],[o.cityCountry,joined([o.city,o.country])],[o.stateCountry,joined([o.state,o.country])]]){
      if(field!=null&&!equal(field,expected))return null
    }
    seen.add(o.location)
  }
  if(!Array.isArray(job.standardised_multi_location)||!job.standardised_multi_location.length
    ||job.standardised_multi_location.some(o=>countryCode(o.standardisedCountry)!=='IN'))return null
  return offices
}
const detailFailure = (job,kind,evidence={}) => ({...job,...evidence,jobDescription:null,sourceDetailComplete:false,sourceDetailFailureKind:kind})
const corroborate = (listing,html,raw) => {
  const model=readNativePage(html),job=model.ddo?.jobDetail?.data?.job,posting=model.posting
  const envelope=model.ddo?.jobDetail
  if(!job||envelope?.status!==200||hasUpstreamError(envelope.error)||hasUpstreamError(envelope.errorMsg)||hasUpstreamError(envelope.errorCode)||envelope.success===false
    ||model.app?.refNum!=='ABLAUS'||model.app.siteType!=='external'||model.app.pageName!=='job')throw incomplete('missing successful detail model')
  const posted=publication(raw,job,posting),deadline=closing(raw,job,posting)
  const nativeEvidence={postingDate:posted.value,closingDate:deadline.value,sourceClosingDateIsExact:deadline.precision==='timestamp',
    sourceClosingDatePrecision:deadline.precision,sourceNativeDetail:job,sourceNativeJobPosting:posting,sourceNativeCanonical:model.canonical,
    sourceNativeMLDescription:job.ml_Description??null,sourceNativePublicationEvidence:posted.evidence,sourceNativeClosingEvidence:deadline.evidence,
    sourceNativeLifecycleEvidence:{listingPostingStatus:raw.postingStatus??null,listingJobReqStatus:raw.jobReqStatus??null,postingStatus:job.postingStatus??null,jobReqStatus:job.jobReqStatus??null,skipJob:job.skipJob??null,displayCareerSite:job.displayCareerSite??null,nativeOpenStatusVerified:job.postingStatus==='OPEN'||job.jobReqStatus==='OPEN',closingDateKnown:deadline.value!=null,unknownClosingDateInferred:false}}
  
  if(model.advertisedMainViews.filter(v=>MAIN_DESCRIPTION_VIEWS.has(v)).length!==1)return detailFailure(listing,'missing-advertised-authoritative-view',nativeEvidence)
  const id=raw.jobId,expectedSequence=raw.jobSeqNo,postingId=typeof posting?.identifier==='string'?posting.identifier:posting?.identifier?.value
  const primaryCountry=countryCode(raw.country)
  if(job.jobId!==id||job.reqId!==id||job.jobSeqNo!==expectedSequence||!equal(job.title,raw.title)||posting&&(!equal(posting.title,raw.title)||postingId!==id)
    ||!validCanonical(model.canonical,id,expectedSequence)
    ||posting?.hiringOrganization?.name!=null&&!equal(posting.hiringOrganization.name,job.companyName)
    ||posting?.hiringOrganization?.url!=null&&!validCanonical(posting.hiringOrganization.url,id,expectedSequence)
    ||job.refNum!=='ABLAUS'||job.parentRefNum!=='ABLAUS'||job.companyName!=='Abbott Laboratories'
    ||job.siteType!=='external'||!externalVisibility(job.jobVisibility)||job.locale!=='en_US'
    ||!validApply(raw.applyUrl,id)||job.applyUrl!==raw.applyUrl
    ||primaryCountry!=='IN'||![job.country,job.standardisedCountry,job.ml_country,job.country_raw].every(value=>countryCode(value)==='IN'))return detailFailure(listing,'identity-mismatch',nativeEvidence)
  if(job.displayCareerSite!==true||job.skipJob===true||raw.skipJob===true||[job.postingStatus,job.jobReqStatus,raw.postingStatus,raw.jobReqStatus].some(v=>v!=null&&v!=='OPEN'))return detailFailure(listing,'native-closed-or-unverified',nativeEvidence)
  const offices=officeProof(raw,job),primary=offices?.find(o=>countryCode(o.country)===primaryCountry&&equal(o.city,raw.city)&&equal(o.state||'',raw.state||''))
  const target=offices?.find(o=>india(o.country))
  if(!primary||!target||!equal(raw.cityStateCountry,primary.cityStateCountry)||!equal(job.cityStateCountry,primary.cityStateCountry)
    ||!equal(job.city,primary.city)||!equal(job.state||'',primary.state||'')||!equal(job.location,primary.location))return detailFailure(listing,'identity-mismatch',nativeEvidence)
  // JobPosting is optional, but its explicit assertions must agree with the
  // bound DDO employer and typed India offices. Missing optional countries
  // remain unknown; supplied country names/codes must resolve consistently.
  const locations=posting?.jobLocation==null?[]:Array.isArray(posting.jobLocation)?posting.jobLocation:[posting.jobLocation]
  const countries=locations.flatMap(place=>{
    const addresses=place?.address==null?[]:Array.isArray(place.address)?place.address:[place.address]
    return addresses.flatMap(address=>address?.addressCountry==null?[]:Array.isArray(address.addressCountry)?address.addressCountry:[address.addressCountry])
  })
  if(countries.some(value=>{
    const code=countryCode(value&&typeof value==='object'?value.name:value)
    return code!==primaryCountry||!offices.some(office=>countryCode(office.country)===code)
  }))return detailFailure(listing,'identity-mismatch',nativeEvidence)
  if(!posted.valid||!deadline.valid)return detailFailure(listing,!posted.valid?'invalid-publication':'invalid-closing-date',nativeEvidence)
  const normalized=shared.extractJobDetail(html,listing)
  // Current advertised Abbott job-nav binds its main JOB DESCRIPTION block
  // directly to jobDetail.description | sanitizeHTML. Keep ML projections separate.
  const nativeDescription=typeof job.description==='string'?decodeNativeEntities(job.description):null
  if(!nativeDescription||/&(?:lt|#0*60|#x0*3c);\s*\/?[a-z]/i.test(nativeDescription)
    ||!extractActiveDescription(nativeDescription))return detailFailure(listing,'missing-content',nativeEvidence)
  return {...listing,...normalized,company:COMPANY,source:SOURCE,jobId:id,requisitionId:id,title:raw.title,
    sourceUrl:listing.sourceUrl,applyUrl:raw.applyUrl,link:raw.applyUrl,country:'India',city:target.city,
    location:target.cityStateCountry,locations:offices.filter(o=>india(o.country)).map(o=>o.cityStateCountry),
    jobDescription:nativeDescription,postingDate:posted.value,closingDate:deadline.value,
    sourceClosingDateIsExact:deadline.precision==='timestamp',sourceClosingDatePrecision:deadline.precision,sourceDetailComplete:true,
    sourceDetailFailureKind:undefined,publicExperienceChecked:true,sourceNativeListing:raw,sourceNativeLocations:job.multi_location,
    ...nativeEvidence,
    sourceDescriptionEvidence:{authoritativeField:'jobDetail.data.job.description',clientBinding:model.advertisedMainViews.find(v=>MAIN_DESCRIPTION_VIEWS.has(v))+':jobDetail.description | sanitizeHTML',decoding:'one-pass-protected-decodeNativeEntities',
      validation:'protected-extractActiveDescription',mlProjectionUsed:false},
    sourceEmployerEvidence:{companyName:job.companyName,jobCompany:job.jobCompany??null,hiringOrganization:posting?.hiringOrganization??null,
      scope:'official ABLAUS external India country-filtered inventory; whole-company coverage unproven',legalEmployerVerified:false}}
}

const requestDetail = async (fetcher,url,signal) => {
  signal.throwIfAborted()
  let onAbort
  const aborted=new Promise((_,reject)=>{onAbort=()=>reject(signal.reason);signal.addEventListener('abort',onAbort,{once:true})})
  try{return await Promise.race([fetcher(url,{signal}),aborted])}finally{signal.removeEventListener('abort',onAbort);signal.throwIfAborted()}
}
export const run = async (options={}) => {
  const defaultText=(url,request={})=>fetchTextWithRetry(url,{...request,attempts:1,timeoutMs:15000,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}})
  const defaultJson=(url,request={})=>fetchJsonWithRetry(url,{...request,attempts:1,timeoutMs:15000})
  const getText=options.fetchText||defaultText,getJson=options.fetchJson||defaultJson,rawListings=new Map()
  let advertisedCountries=[]
  const getListingPage=async (url,request)=>{
    const u=new URL(url);u.searchParams.set('qcountry','India')
    const html=await getText(u.toString(),request),{app,ddo}=readNativePage(html)
    if(app?.widgetApiEndpoint!==BASE_URL+'/widgets'||app.refNum!=='ABLAUS'||app.pageName!=='search-results'
      ||app.country!=='us'||app.locale!=='en_us'||app.deviceType!=='desktop'||app.siteType!=='external'
      ||!ddo?.siteConfig?.data?.siteSettings?.refineSearch?.enabledFacets?.includes('country'))throw incomplete('missing official Abbott external bootstrap binding')
    const eager=ddo.eagerLoadRefineSearch
    if(ddo.siteConfig.status!=='success'||ddo.siteConfig.success===false||hasUpstreamError(ddo.siteConfig.error)||hasUpstreamError(ddo.siteConfig.errorCode)||hasUpstreamError(ddo.siteConfig.errorMsg)
      ||eager?.status!==200||eager.success===false||hasUpstreamError(eager.error)||hasUpstreamError(eager.errorCode)||hasUpstreamError(eager.errorMsg))throw incomplete('native initial listing failure')
    const countries=eager.data?.aggregations?.find(a=>a.field==='country')?.value
    advertisedCountries=Object.keys(countries??{}).filter(india)
    if(!advertisedCountries.length)throw incomplete('missing advertised typed India facet')
    return html
  }
  const getInventory=async (url,request)=>{
    if(url!==BASE_URL+'/widgets'||request.method!=='POST')throw incomplete('unadvertised inventory request')
    const body=JSON.parse(request.body)
    if(JSON.stringify(body.selected_fields)!==JSON.stringify({country:advertisedCountries})||body.ddoKey!=='refineSearch'||body.lang!=='en_us'||body.country!=='us'||body.deviceType!=='desktop'||body.pageName!=='search-results'
      ||body.global!==true||body.jobs!==true||body.counts!==true||body.keywords!==''||body.sortBy!=='Most recent'||JSON.stringify(body.sort)!==JSON.stringify({field:'postedDate',order:'desc'})
      ||!Number.isInteger(body.from)||body.from<0||!Number.isInteger(body.size)||body.size<1||body.size>500)throw incomplete('unadvertised inventory body')
    const response=await getJson(url,{...request,body:JSON.stringify(body)}),r=response?.refineSearch
    if(response?.success===false||response?.status!=null&&response.status!==200&&response.status!=='success'||hasUpstreamError(response?.error)||hasUpstreamError(response?.errorMsg)||hasUpstreamError(response?.errorCode)||r?.status!==200||r.success===false||hasUpstreamError(r.error)||hasUpstreamError(r.errorCode)||hasUpstreamError(r.errorMsg)||!Array.isArray(r.data?.jobs)||r.hits!==r.data.jobs.length
      ||r.data.ui_selections!=null&&JSON.stringify(r.data.ui_selections)!==JSON.stringify(body.selected_fields)
      ||r.data.keywords!=null&&r.data.keywords!==''||r.data.subsearch!=null&&r.data.subsearch!=='')throw incomplete('unreconciled native global inventory')
    for(const raw of r.data.jobs){
      if(!/^\d+$/.test(raw.jobId)||raw.reqId!==raw.jobId||raw.jobSeqNo!=='ABLAUS'+raw.jobId+'ENUSEXTERNAL'
        ||raw.siteType!=='external'||!['External','Internal/External'].includes(raw.visibilityType)||!externalVisibility(raw.jobVisibility)
        ||!validApply(raw.applyUrl,raw.jobId)||countryCode(raw.country)!=='IN')throw incomplete('invalid Abbott native listing identity or country')
      const previous=rawListings.get(raw.jobId)
      if(previous&&JSON.stringify(previous)!==JSON.stringify(raw))throw incomplete('native listing changed across pages')
      rawListings.set(raw.jobId,raw)
    }
    return response
  }
  const jobs=await shared.run({...options,fetchText:getListingPage,fetchJson:getInventory,useWidgetApi:true,detailEnrichmentBudgetMs:0})
  const listingEvidence=readInventoryEvidence(jobs),signal=options.signal
  const detailBudget=budget(options.detailEnrichmentBudgetMs??process.env.PHENOM_DETAIL_ENRICHMENT_BUDGET_MS,180000)
  const controller=new AbortController(),detailSignal=signal?AbortSignal.any([signal,controller.signal]):controller.signal
  const timer=detailBudget>0?setTimeout(()=>controller.abort(incomplete('detail budget expired')),detailBudget):null
  let next=0
  try{
    if(detailBudget>0)await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{
      while(!detailSignal.aborted){
        const index=next++;if(index>=jobs.length)return
        const listing=jobs[index],raw=rawListings.get(listing.jobId)
        try{jobs[index]=corroborate(listing,await requestDetail(getText,listing.sourceUrl,detailSignal),raw)}
        catch{signal?.throwIfAborted();jobs[index]=detailFailure(listing,detailSignal.aborted?'budget-exhausted':'upstream')}
      }
    }))
  }finally{if(timer)clearTimeout(timer)}
  signal?.throwIfAborted()
  const allDetails=jobs.every(job=>job.sourceDetailComplete===true)
  for(const job of jobs){
    const raw=rawListings.get(job.jobId)
    job.sourceNativeListing??=raw
    if(!job.sourceNativePublicationEvidence){const posted=publication(raw,null,null);job.postingDate=posted.value;job.sourceNativePublicationEvidence=posted.evidence}
    if(!allDetails||listingEvidence?.listingComplete!==true)job.sourceListingComplete=false
  }
  for(const job of jobs)job.sourceListingComplete=false
  return attachInventoryEvidence(jobs,{...listingEvidence,status:'discovery-only',listingComplete:false,
    reason:allDetails?'Abbott filtered India rows enumerated; country facet consistency and whole-company scope unproven; preserve existing vacancies':'Abbott India inventory has unverified details; preserve existing vacancies',
    companyScopeVerified:false})
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  if(!process.argv.includes('--dry-run'))throw new Error('Abbott standalone execution requires --dry-run; persistence belongs to the managed runner')
  const {saveToFile}=await import('../../scraper-support/utils/saveToDB.js')
  saveToFile(await run(),path.join(currentDir,'jobs.json'))
}
