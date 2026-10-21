import {CORPORATE,BOARD,API,parseCastrolBoard,validateCastrolInventory,validateCastrolDetail} from './nativeContract.js'
import {runApiPortalScraper} from '../../scraper-support/apiPortal/engine.js'
import {expandApiPortalProviderTemplate} from '../../scraper-support/providers/apiPortalTemplates.js'
import {attachInventoryEvidence,readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const check=(ok,message)=>{if(!ok)throw new Error('Castrol native inventory: '+message)}
export async function runNativeCastrol(options={}){
 const fetchImpl=options.fetchImpl??globalThis.fetch,timeoutMs=options.timeoutMs??120000,cap=options.maxJobs??Infinity,now=typeof options.now==='function'?options.now():options.now??new Date().toISOString()
 check(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=180000,'Invalid bounded deadline');check(cap===Infinity||Number.isInteger(cap)&&cap>=0,'Invalid cap');check(Number.isFinite(Date.parse(now)),'Invalid check time')
 const c=new AbortController(),timer=setTimeout(()=>c.abort(new Error('Castrol source deadline')),timeoutMs),signal=options.signal?AbortSignal.any([options.signal,c.signal]):c.signal,abort=()=>{if(signal.aborted)throw signal.reason||new Error('Caller aborted')}
 async function bounded(fn){abort();let listener;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{listener=()=>reject(signal.reason||new Error('Caller aborted'));signal.addEventListener('abort',listener,{once:true})})])}finally{signal.removeEventListener('abort',listener);abort()}}
 async function get(url){const r=await bounded(()=>fetchImpl(url,{signal,headers:{Accept:'text/html,application/json'},redirect:'follow'}));check(r.status===200&&r.url===url,'Native HTTP status/URL changed');const body=await bounded(()=>r.text());check(typeof body==='string'&&body.length<=12000000,'Native response invalid');return body}
 try{
  const corporate=await get(CORPORATE),boardHtml=await get(BOARD),board=parseCastrolBoard(corporate,boardHtml),payload=JSON.parse(await get(API)),inventory=validateCastrolInventory(payload,board,{now}),details=new Map()
  for(let i=0;i<inventory.india.length;i+=2)await Promise.all(inventory.india.slice(i,i+2).map(async row=>details.set(row.raw.id,validateCastrolDetail(await get(row.raw.absolute_url),row,{now}))))
  const last=JSON.parse(await get(API));validateCastrolInventory(last,board,{now});check(JSON.stringify(last)===JSON.stringify(payload),'Native full inventory drift')
  const provider=expandApiPortalProviderTemplate({source:'castrolindia',companyName:'Castrol India',companyCareerPage:CORPORATE,countryFilter:'India',template:'greenhouse',templateOptions:{boardToken:'castrol',locationPattern:'\\bIndia\\b'}})
  provider.config.mapping.location='verifiedNativeLocation';provider.config.mapping.jobDescription='verifiedNativeDescription';provider.config.mapping.postingDate='first_published'
  const prepared={...payload,jobs:inventory.rows.map(row=>({...row.raw,verifiedNativeLocation:row.india?row.location:row.nativeLocation,verifiedNativeDescription:details.has(row.raw.id)?details.get(row.raw.id).jobDescription:row.raw.content}))}
  const mapped=await bounded(()=>runApiPortalScraper({provider,fetchJson:async()=>prepared})),inner=readInventoryEvidence(mapped);check(mapped.length===details.size&&new Set(mapped.map(j=>String(j.jobId))).size===details.size,'Shared mapper lost/duplicated verified India roles')
  const jobs=mapped.map(job=>{const detail=details.get(Number(job.jobId));check(detail,'Shared mapper produced unverified identity');return{...job,...detail}}),complete=inventory.scopeComplete&&jobs.every(j=>j.sourceDetailComplete)&&cap>=jobs.length&&inner?.listingComplete===true
  abort();return attachInventoryEvidence(jobs.slice(0,cap).map(j=>({...j,sourceListingComplete:complete})),{status:complete?(payload.jobs.length?'complete-inventory':'verified-empty'):'coverage-gap',surface:API,firstParty:true,listingComplete:complete,pagesFetched:2,reportedTotal:payload.meta.total,indiaFacetCount:inventory.scopeComplete?inventory.india.length:null,verifiedAt:now,reason:!inventory.scopeComplete?'native-global-location-scope-unresolved':jobs.some(j=>!j.sourceDetailComplete)?'native-full-description-missing':cap<jobs.length?'caller-cap':inner?.listingComplete!==true?'shared-native-inventory-incomplete':'current-full-native-Greenhouse-feed-and-details'})
 }finally{clearTimeout(timer)}
}
