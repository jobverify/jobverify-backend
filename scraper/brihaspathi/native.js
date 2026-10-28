import {createHash} from 'node:crypto'
import {setTimeout as delay} from 'node:timers/promises'
import {readNativeDocument} from '../../scraper-support/utils/activeNativeHtml.js'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'

export const SOURCE='brihaspathi'
export const COMPANY='Brihaspathi Technologies Limited'
export const CAREERS_URL='https://www.brihaspathi.com/careers'
export const CLIENT_URL='https://brihaspathi.com/_next/static/chunks/42s4mc2c2afza.js'
export const JOBS_API_URL='https://brihaspathi.com/strapi/api/job-openings?sort=createdAt:desc&pagination[pageSize]=100&filters[isActive][$eq]=true'
export const CLIENT_SHA256='a6077cf32ec4f8e788f694cfa20bc9fda138039338d2b0ef5bbc102667b78f37'
export const sha256=value=>createHash('sha256').update(value).digest('hex')
const check=(ok,message)=>{if(!ok)throw Error('Brihaspathi current native: '+message)}
const clean=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim():null
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)
const timestamp=(value,label)=>{
 if(value==null)return null
 check(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)&&Number.isFinite(Date.parse(value)),'invalid CMS '+label+' timestamp')
 check(new Date(value).toISOString().slice(0,10)===value.slice(0,10),'invalid CMS '+label+' timestamp')
 return value
}

export function inspectNativePage(html,client){
 check(typeof html==='string'&&typeof client==='string','page/client must be text')
 const doc=readNativeDocument(html)
 check(doc.nodes(n=>n.tag==='title').some(n=>n.raw==='Brihaspathi technologies limited'),'official employer title changed')
 const organizations=doc.nodes(n=>n.tag==='script'&&n.attrs.type==='application/ld+json').flatMap(n=>{try{return[JSON.parse(n.raw)]}catch{return[]}})
 check(organizations.some(n=>n['@type']==='Organization'&&n.name===COMPANY&&n.url==='https://brihaspathi.com/'),'official employer organization missing')
 const clientNodes=doc.nodes(n=>n.tag==='script'&&n.attrs.src===new URL(CLIENT_URL).pathname&&!Object.hasOwn(n.attrs,'nomodule')&&(!n.attrs.type||['text/javascript','module','application/javascript'].includes(n.attrs.type)))
 check(clientNodes.length===1,'current executable client delegation missing')
 check(sha256(client)===CLIENT_SHA256,'reviewed client contract changed; re-review required')
 check(doc.nodes(n=>n.attrs.id==='vacancies').length===1,'native open roles section missing')
 // The reviewed React client renders API strings as plain text, filters postedBy
 // globally and opens an application modal bound to the numeric posting id.
 // It exposes no full JD or role country/publication/expiry/requisition UI.
 return{employer:COMPANY,clientVerified:true,clientSha256:CLIENT_SHA256,sourceScopeComplete:false}
}

const regionNames=new Intl.DisplayNames(['en'],{type:'region',fallback:'none'}),countryCodes=new Map(),countryNames=new Map()
for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){
 const code=String.fromCharCode(a,b),name=regionNames.of(code)
 if(name&&!['ZZ','XA','XB','UN','EU','EZ','QO'].includes(code)){countryCodes.set(code,name);countryNames.set(name.toLowerCase(),code)}
}
for(const [name,code]of[['usa','US'],['united states of america','US'],['uk','GB'],['uae','AE']])countryNames.set(name,code)
function countryEvidence(row,location){
 const country=clean(row.country),code=clean(row.countryCode)
 check((row.country==null||Boolean(country))&&(row.countryCode==null||Boolean(code)),'malformed native country')
 const named=country&&(countryNames.get(country.toLowerCase())||(countryCodes.has(country.toUpperCase())?country.toUpperCase():null)),typed=code?.toUpperCase()
 check(!country||Boolean(named),'unrecognized native country name')
 check(!typed||countryCodes.has(typed),'unrecognized native country code')
 const fromLocation=location.split(/[,;|]/).map(value=>countryNames.get(value.trim().toLowerCase())).filter(Boolean)
 const codes=[...new Set([named,typed,...fromLocation].filter(Boolean))],conflict=codes.length>1,resolved=conflict?null:codes[0]||null
 return{country:resolved?countryCodes.get(resolved):null,countryCode:resolved,reasons:conflict?['conflicting-native-country']:resolved?[]:['native-work-country-unpublished']}
}

export function inspectNativePayload(payload){
 check(payload&&Array.isArray(payload.data)&&payload.meta?.pagination,'malformed native job-openings payload')
 const p=payload.meta.pagination
 check([p.page,p.pageSize,p.pageCount,p.total].every(Number.isSafeInteger)&&p.page===1&&p.pageSize===100&&p.total>=0&&p.pageCount===Math.ceil(p.total/p.pageSize),'invalid native pagination metadata')
 check(payload.data.length===Math.min(p.total,p.pageSize),'native returned cardinality does not match total')
 const ids=new Set(),rows=payload.data.map(row=>{
  check(row&&typeof row==='object'&&!Array.isArray(row),'invalid native row')
  const v=row.attributes?{id:row.id,...row.attributes}:row
  check(Number.isSafeInteger(v.id)&&v.id>0&&!ids.has(v.id),'invalid or duplicate native posting identity');ids.add(v.id)
  for(const key of ['title','department','location','experience','description'])check(Boolean(clean(v[key])),'missing native '+key+'; frontend defaults are not evidence')
  check(v.isActive===true,'inactive or ambiguous native record returned by active filter')
  check(v.required_skills==null||typeof v.required_skills==='string'||Array.isArray(v.required_skills)&&v.required_skills.every(s=>typeof s==='string'),'malformed native required skills')
  check(v.postedBy==null||typeof v.postedBy==='string','malformed postedBy')
  check(v.posted_by==null||typeof v.posted_by==='string','malformed posted_by')
  const location=clean(v.location),country=countryEvidence(v,location)
  return{title:clean(v.title),company:COMPANY,department:clean(v.department),location,city:null,country:country.country,countryCode:country.countryCode,
   jobId:String(v.id),requisitionId:null,sourceUrl:'https://brihaspathi.com/careers#vacancies',applyUrl:'https://brihaspathi.com/careers#vacancies',
   applicationContext:{kind:'native-job-opening-modal',jobOpeningId:v.id,submissionPerformed:false},
   employmentType:null,experienceRequired:clean(v.experience),minimumQualification:null,preferredQualification:null,
   requiredSkills:(Array.isArray(v.required_skills)?v.required_skills:v.required_skills==null?[]:[v.required_skills]).map(clean).filter(Boolean),
   postingDate:null,closingDate:null,remoteStatus:null,jobDescription:clean(v.description),sourceDetailComplete:false,fullNativeCriteriaAvailable:false,
   nativeCmsPublication:timestamp(v.publishedAt,'publishedAt'),nativeCmsCreatedAt:timestamp(v.createdAt,'createdAt'),nativeCmsUpdatedAt:timestamp(v.updatedAt,'updatedAt'),
   nativePostedBy:clean(v.postedBy||v.posted_by),nativeHasPoster:Boolean(v.postedBy||v.posted_by),sourceScopeReasons:country.reasons,sourceListingComplete:false}
 })
 const hasPoster=rows.some(row=>row.nativeHasPoster)
 const records=hasPoster?rows.filter(row=>['hr','human resources','human-resource'].includes(row.nativePostedBy?.toLowerCase())):rows
 const apiPageComplete=p.total<=p.pageSize
 return{records,apiPageComplete,reportedTotal:p.total,rawReturnedRecords:rows.length,filteredNonHrRecords:rows.length-records.length,
  confirmedIndiaRecords:records.filter(r=>r.countryCode==='IN').length,unknownCountryRecords:records.filter(r=>!r.countryCode).length,
  reasons:['native-cards-only;full-criteria-unpublished','job-publication-expiry-and-formal-requisition-unpublished','whole-company-hiring-scope-unverified',
   ...(!apiPageComplete?['native-client-first-100-record-ceiling']:[]),...new Set(records.flatMap(r=>r.sourceScopeReasons))]}
}

const bounded=(operation,signal)=>new Promise((resolve,reject)=>{
 const cleanup=()=>signal.removeEventListener('abort',abort)
 const abort=()=>{cleanup();reject(signal.reason||Error('Brihaspathi aborted'))}
 if(signal.aborted){abort();return}signal.addEventListener('abort',abort,{once:true})
 Promise.resolve().then(operation).then(v=>{cleanup();resolve(v)},e=>{cleanup();reject(e)})
})

export async function runNativeBrihaspathi(options={}){
 const maxJobs=options.maxJobs??Infinity,timeoutMs=options.timeoutMs??45000,interval=options.requestIntervalMs??500
 check(maxJobs===Infinity||Number.isSafeInteger(maxJobs)&&maxJobs>=0,'invalid caller cap')
 check(Number.isSafeInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=180000,'invalid deadline')
 check(Number.isSafeInteger(interval)&&interval>=0&&(interval>=500||options.fetchPage||options.fetchImpl),'invalid request pacing')
 const now=typeof options.now==='function'?options.now():options.now||new Date().toISOString()
 check(Number.isFinite(Date.parse(now)),'invalid observation time')
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(Error('Brihaspathi source deadline exceeded')),timeoutMs)
 const signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal
 const fetchPage=options.fetchPage||options.fetchImpl||globalThis.fetch,receipts=[];let previous=0
 const get=async url=>{
  signal.throwIfAborted();const remaining=interval-(Date.now()-previous);if(remaining>0)await delay(remaining,undefined,{signal});signal.throwIfAborted();previous=Date.now()
  const r=await bounded(()=>fetchPage(url,{method:'GET',redirect:'follow',signal,headers:{Accept:url===JOBS_API_URL?'application/json':'*/*'}}),signal)
  check(r.status===200,'public HTTP '+r.status+'; stopped without retry')
  check(r.url===(url===CAREERS_URL?'https://brihaspathi.com/careers':url),'public response URL changed')
  const body=await bounded(()=>r.text(),signal);signal.throwIfAborted()
  check(typeof body==='string'&&Buffer.byteLength(body)<=3000000,'invalid response body')
  receipts.push({url,sha256:sha256(body),at:new Date().toISOString()});return body
 }
 const snapshot=async()=>{
  const html=await get(CAREERS_URL),client=await get(CLIENT_URL),page=inspectNativePage(html,client)
  let payload;try{payload=JSON.parse(await get(JOBS_API_URL))}catch(error){check(false,'native JSON invalid: '+error.message)}
  return{page,...inspectNativePayload(payload)}
 }
 try{
  const first=await snapshot(),last=await snapshot()
  check(canonical(first)===canonical(last),'native closing snapshot changed identities, fields, visibility or pagination')
  const india=first.records.filter(r=>r.countryCode==='IN'),jobs=india.slice(0,maxJobs).map(r=>({...r,source:SOURCE,link:r.applyUrl,scrapedAt:now}))
  const reasons=[...first.reasons,...(maxJobs<india.length?['caller-cap-after-reconciliation']:[])]
  Object.defineProperty(jobs,'nativeInventoryEvidence',{value:{...first,reasons,receipts,verifiedAt:now,observedNativeRecords:first.records.length,
   fullNativeDescriptionRecords:0,fullNativeHealthyIndiaJobs:0,eligibleFullIndiaJobs:0,closingReconciled:true,
   sourceScopeComplete:false,indiaAbsenceProven:false,lifecycleCleanupAllowed:false},enumerable:false})
  signal.throwIfAborted()
  if(options.onNativeEvidence)await options.onNativeEvidence(jobs.nativeInventoryEvidence)
  signal.throwIfAborted()
  return attachInventoryEvidence(jobs,{status:'coverage-gap',surface:CAREERS_URL,firstParty:true,listingComplete:false,pagesFetched:receipts.length,
   reportedTotal:first.reportedTotal,indiaFacetCount:null,verifiedAt:now,reason:reasons.join(';')})
 }finally{clearTimeout(timer)}
}
