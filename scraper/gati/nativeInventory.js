import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {createDarwinboxScraper} from '../darwinbox/script.js'
import {activeHead, readNativeDocument} from '../../scraper-support/utils/activeNativeHtml.js'
import {attachInventoryEvidence, normalizeInventoryEvidence, readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {currentCorporateScopeHash} from './corporateScope.js'

const review=JSON.parse(fs.readFileSync(new URL('./reviewedNativeScope.json',import.meta.url),'utf8'))
const ROOT='https://www.gati.com/',PARENT='https://www.allcargologistics.com/',CAREERS=PARENT+'about-us/careers'
const ORIGIN='https://allcargologistics.darwinbox.in',HOME=ORIGIN+'/ms/candidatev2/main/careers/home',SEED=ORIGIN+'/ms/candidatev2/main/careers/allJobs'
const CLIENT=ORIGIN+'/ms/candidatev2/main.71bd301266b6050c.js'
const CONFIG=ORIGIN+'/ms/candidateapi/getCompanyConfig?is_preview=false&companyId=main',GROUP=ORIGIN+'/ms/candidateapi/groupcompanycareersetting?companyId=main',LISTING=ORIGIN+'/ms/candidateapi/job?page=1&companyId=main'
const CHROME='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const sha=value=>createHash('sha256').update(value).digest('hex')
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)
const requireNative=(ok,message)=>{if(!ok){const error=new Error('Gati native inventory: '+message);error.abortRetries=true;error.failureKind='parser_or_contract_error';throw error}}

// Gati's current first-party alias graph is distinct from the Allcargo source.
// No tenant fallback or redirect alone establishes absence of Gati vacancies.
// Whole-body signatures retain every script/form/frame/attribute and visible
// role; the corporate normalizer permits only proven SSR serialization changes.
export async function runCurrentGatiInventory(options={}){
 const {fetchImpl=fetch,signal,onAudit}=options,receipts=[],reasons=new Set()
 signal?.throwIfAborted()
 requireNative(!options.fetchPage&&!options.fetchText&&!options.fetchJson&&!options.probeListingApi,'native HTTP metadata required; body-only overrides unsupported')
 requireNative(options.maxJobs==null&&options.maxPages==null,'inventory caps unsupported')
 const note=(ok,reason)=>{if(!ok)reasons.add(reason);return ok}
 async function request(url,init={},seed=false){
  signal?.throwIfAborted()
  const deadline=signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)
  const response=await fetchImpl(url,{...init,method:'GET',headers:{'User-Agent':CHROME,...init.headers},redirect:'manual',signal:deadline})
  deadline.throwIfAborted()
  requireNative(response?.url===url,'HTTP response URL changed: '+url)
  const receipt={url,method:'GET',status:response.status,responseUrl:response.url};receipts.push(receipt)
  if(seed){requireNative(response.status===200,'public session seed HTTP failure');requireNative(/^text\/html\b/i.test(response.headers?.get('content-type')||''),'public session seed content type changed');await response.body?.cancel();deadline.throwIfAborted();Object.assign(receipt,{bodyConsumed:false,purpose:'public-session-seed-metadata-only'});return {response,receipt}}
  requireNative(response.status===(url===ROOT?301:200)||init.allow403&&response.status===403,'HTTP status changed: '+url)
  const limit=url===PARENT?8000000:4000000,chunks=[];let bytes=0
  requireNative(response.body?.getReader,'streaming HTTP body metadata unavailable')
  const reader=response.body.getReader()
  try{for(;;){const {value,done}=await reader.read();deadline.throwIfAborted();if(done)break;bytes+=value.byteLength;requireNative(bytes<=limit,'response budget exceeded: '+url);chunks.push(Buffer.from(value))}}catch(error){await reader.cancel().catch(()=>{});throw error}finally{reader.releaseLock()}
  const body=Buffer.concat(chunks).toString('utf8');Object.assign(receipt,{bytes,sha256:sha(body)})
  return {response,body,receipt}
 }
 async function surface(url){
  const value=await request(url),{response,body}=value
  requireNative(/^text\/html\b/i.test(response.headers?.get('content-type')||''),'HTML content type changed')
  const signature=review.corporate[url]?currentCorporateScopeHash(body,review.corporate[url]):sha(body)
  note(Boolean(signature)&&signature===(review.corporate[url]?.scopeSha256||review.surfaceHashes[url]),'unreviewed-source-bytes:'+url)
  if(url===ROOT){note(response.headers.get('location')===PARENT,'Gati-current-redirect-changed');return sha(body)}
  const doc=readNativeDocument(body),head=activeHead(body)
  const links=doc.nodes(n=>n.tag==='a'&&n.attrs.href).map(n=>{try{return new URL(n.attrs.href,url).href}catch{return null}})
  if(url===PARENT){note(head.titles.length===1&&head.titles[0]==='Allcargo Logistics','parent-brand-changed');note(doc.nodes(n=>/^h[1-6]$/.test(n.tag)).some(n=>/AllcargoGATI: India's Premier Express Distribution and Supply Chain Solutions/i.test(doc.text(n))),'active-Gati-alias-heading-missing');note(links.includes(CAREERS),'parent-careers-handoff-missing')}
  else if(url===CAREERS)note(links.filter(link=>link===HOME).length===3,'active-current-native-handoff-changed')
  else{/* The actual Angular shell has an empty title; employer identity comes from the exact current config, never from a synthesized meta tag. */ note(head.titles.length===1&&head.titles[0]===''&&!head.metas.some(m=>['og:title','twitter:title'].includes(m.property||m.name)),'native-shell-identity-shape-changed');const scripts=doc.nodes(n=>n.tag==='script'&&n.attrs.src);note(scripts.some(n=>new URL(n.attrs.src,ORIGIN+'/ms/candidatev2/').href===CLIENT),'published-client-handoff-changed')}
  return signature
 }
 async function client(){const {body,response}=await request(CLIENT);requireNative(/(?:java|ecma)script/i.test(response.headers?.get('content-type')||''),'client content type changed');note(sha(body)===review.surfaceHashes[CLIENT]&&['getCompanyConfig','groupcompanycareersetting','job?page='].every(value=>body.includes(value)),'published-native-client-contract-changed');return sha(body)}
 async function api(url){
  let deniedReceipt
  for(let attempt=0;attempt<2;attempt++){
   const session=await request(SEED,{},true),cookies=session.response.headers?.getSetCookie?.().map(v=>v.split(';')[0]).filter(Boolean).join('; ')
   requireNative(Boolean(cookies),'public native session unavailable')
   // Use the exact publicly successful research profile. No profile rotation
   // or browser/challenge execution is attempted when this bounded read fails.
   const value=await request(url,{allow403:true,headers:{'User-Agent':'Mozilla/5.0 (compatible; Jobverify scraper)',Cookie:cookies,Origin:ORIGIN,Referer:SEED}})
   if(value.response.status===403){
    if(attempt)throw Object.assign(new Error('Gati native API unavailable after bounded fresh public session retry'),{
     code:'GATI_NATIVE_PUBLIC_API_UNAVAILABLE',softFailure:true,abortRetries:true,failureKind:'blocked_or_access_denied',
     status:403,statusCode:403,requestUrl:url,receipts,lifecycleCleanupAllowed:false,
     inventoryEvidence:normalizeInventoryEvidence({status:'coverage-gap',surface:HOME,firstParty:false,listingComplete:false,pagesFetched:receipts.length,reportedTotal:null,indiaFacetCount:null,verifiedAt:new Date(options.now?options.now():Date.now()).toISOString(),reason:'Public native API denied both bounded fresh-session reads; employer configuration and vacancy inventory unavailable'}),
    })
    deniedReceipt=value.receipt;continue
   }
   requireNative(/^application\/json\b/i.test(value.response.headers?.get('content-type')||''),'native JSON content type changed')
   let payload;try{payload=JSON.parse(value.body)}catch{requireNative(false,'native JSON malformed')}
   if(deniedReceipt)deniedReceipt.recoveredByFreshSessionRetry=true
   note(canonical(payload)===canonical(review.apiPayloads[url]),'unreviewed-native-payload:'+url)
   return payload
  }
 }
 async function snapshot(){
  const surfaces=[];for(const url of [ROOT,PARENT,CAREERS,HOME,SEED])surfaces.push(await surface(url))
  const clientHash=await client(),company=await api(CONFIG),group=await api(GROUP),listing=await api(LISTING)
  return {surfaces,clientHash,company,group,listing}
 }
 const opening=await snapshot(),closing=await snapshot()
 note(canonical(opening)===canonical(closing),'closing-current-source-scope-changed')
 const empty=value=>value?.status==='success'&&value.message?.jobscount===0&&Array.isArray(value.message.jobs)&&value.message.jobs.length===0
 note(empty(opening.listing)&&empty(closing.listing),'native-zero-unproved')
 // Adapt only the already reconciled empty GET envelope to the unchanged
 // strict Darwinbox pagination engine. Positive records are retained in audit;
 // unsupported criteria/geography never become an invented country or zero.
 if(reasons.size===0){const inner=await createDarwinboxScraper({source:'gati',companyName:'Gati',origin:ORIGIN}).run({fetchListingPage:async()=>({status:'success',data:opening.listing.message.jobs,job_counts:opening.listing.message.jobscount}),maxPages:1,maxJobs:null,signal});note(readInventoryEvidence(inner)?.listingComplete===true,'native-pagination-engine-incomplete')}
 const complete=reasons.size===0,observedAt=new Date(options.now?options.now():Date.now()).toISOString()
 const unresolvedNativeRoles=[...(opening.listing?.message?.jobs||[]),...(closing.listing?.message?.jobs||[])].filter((v,i,rows)=>rows.findIndex(other=>canonical(other)===canonical(v))===i)
 const audit={source:'gati',observedAt,complete,sourceScopeComplete:complete,lifecycleCleanupAllowed:complete,nativeTotal:opening.listing?.message?.jobscount??null,closingNativeTotal:closing.listing?.message?.jobscount??null,globalJobs:complete?0:null,indiaJobs:complete?0:null,fullDescriptions:complete?0:null,unknownCountryJobs:complete?0:null,reasons:[...reasons],unresolvedNativeRoles,sourceNativeOpening:opening,sourceNativeClosing:closing,receipts,productionWrites:false,applicationsVisited:false}
 const jobs=attachInventoryEvidence([],{status:complete?'verified-empty':'discovery-only',firstParty:true,listingComplete:complete,surface:ROOT,pagesFetched:receipts.length,reportedTotal:complete?0:null,indiaFacetCount:complete?0:null,verifiedAt:observedAt,reason:complete?'gati-current-explicit-alias-and-declared-native-empty-reconciled':'gati-current-source-partial:'+audit.reasons.join(';')})
 Object.defineProperty(jobs,'sourceAudit',{value:audit});onAudit?.(structuredClone(audit));return jobs
}
