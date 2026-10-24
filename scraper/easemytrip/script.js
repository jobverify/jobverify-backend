import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { document, decode } from '../../scraper-support/shared/rmkNativePairHtml.js'
import { parseJavaScriptLiteral } from '../../scraper-support/utils/safeLiteral.js'
import { activeHead } from '../../scraper-support/utils/activeNativeHtml.js'
import { attachInventoryEvidence, normalizeInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { isNativeBareCityInPublicScope } from '../../scraper-support/shared/nativeCityScope.js'
import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'

export const SOURCE = 'easemytrip'
export const COMPANY = 'EaseMyTrip'
export const HOME_URL = 'https://www.easemytrip.com/'
export const CAREERS_URL = 'https://www.easemytrip.com/career.html'
export const APPLICATION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScn5D94mZ3r3hq7hpv9OQfxmPFWuM6wzq5eWpTx8citbCqWLQ/viewform'

const requireNative=(ok,why)=>{if(!ok)throw Error(why)}
const activeDocument=html=>{
 const doc=document(html)
 const prune=(n,parent=false)=>{n.inactive ||= parent||/(?:^|;)\s*content-visibility\s*:\s*hidden\s*(?:!important\s*)?(?:;|$)/i.test(n.attrs?.style||'');for(const c of n.children.filter(c=>typeof c!=='string'))prune(c,n.inactive)}
 prune(doc.root);return doc
}
const activeText=value=>{const doc=activeDocument(value);return doc.text(doc.root)}
const description=role=>{
 const fields=[role.about,...role.resp,...role.profile],doc=activeDocument(fields.join('\n'))
 const prose=n=>n.inactive||/^(?:h[1-6]|strong|b|script|style)$/.test(n.tag)?'':n.children.map(c=>typeof c==='string'?decode(c):prose(c)).join(' ')
 const key=value=>String(value||'').replace(/[\s\p{P}\p{S}]+/gu,'').toLowerCase()
 const title=key(activeText(role.title)),placeholders=new Set(['jd','jobdescription','responsibilities','requirements'])
 const substantive=fields.some(field=>{
  if(typeof field!=='string'||!field.trim())return false
  const content=activeDocument(field),core=key(prose(content.root))
  return /[\p{L}\p{N}]/u.test(core)&&core!==title&&!placeholders.has(core)
 })
 return substantive?doc.text(doc.root):null
}
export const inspectInventory = async ({fetchImpl=fetch,signal,timeoutMs=45000,now=()=>new Date().toISOString()}={})=>{
 signal?.throwIfAborted()
 requireNative(Number.isFinite(timeoutMs)&&timeoutMs>=1&&timeoutMs<=180000,'Invalid EaseMyTrip deadline')
 const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal
 const deadline=performance.now()+timeoutMs
 const checkDeadline=()=>{
  if(!combined.aborted&&performance.now()>=deadline)controller.abort(Error('EaseMyTrip aggregate deadline exceeded'))
  combined.throwIfAborted()
 }
 let timer,listener,pagesFetched=0,firstParty=false
 const retainedResponses=[]
 const evidence=()=>normalizeInventoryEvidence({status:'coverage-gap',surface:CAREERS_URL,firstParty,listingComplete:false,pagesFetched,reportedTotal:null,indiaFacetCount:null,verifiedAt:now(),reason:'Native roles publish only city/Remote locations; explicit country, role requisitions and whole inventory scope unverified'})
 const interrupted=new Promise((_,reject)=>{listener=()=>reject(combined.reason);combined.addEventListener('abort',listener,{once:true});timer=setTimeout(()=>controller.abort(Error('EaseMyTrip aggregate deadline exceeded')),timeoutMs)})
 const inspect=async()=>{
  const read=async url=>{
   checkDeadline()
   const r=await fetchImpl(url,{signal:combined,redirect:'manual',headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}})
   let reader,complete=false
   const cancel=()=>{try{Promise.resolve(reader?reader.cancel(combined.reason):r.body?.cancel(combined.reason)).catch(()=>{})}catch{}}
   let body
   try{
    checkDeadline();requireNative(r.status===200&&r.url===url,'Native HTTP status or final URL changed')
    requireNative(typeof r.body?.getReader==='function','Native streaming body unavailable')
    reader=r.body.getReader();combined.addEventListener('abort',cancel,{once:true});checkDeadline()
    const chunks=[];let bytes=0
    while(true){
     checkDeadline()
     const chunk=await reader.read();checkDeadline()
     if(chunk.done){complete=true;break}
     requireNative(chunk.value instanceof Uint8Array,'Native body chunk unavailable')
     bytes+=chunk.value.byteLength
     requireNative(bytes<=5000000,'Native body exceeds bound')
     chunks.push(Buffer.from(chunk.value))
    }
    requireNative(bytes>0,'Native body unavailable')
    body=Buffer.concat(chunks,bytes).toString('utf8')
   }finally{
    combined.removeEventListener('abort',cancel)
    if(!complete)cancel()
    if(reader)reader.releaseLock()
   }
   checkDeadline()
   const doc=activeDocument(body);checkDeadline()
   pagesFetched++;retainedResponses.push({url,finalUrl:r.url,status:r.status,body});return doc
  }
  const home=await read(HOME_URL)
  requireNative(home.nodes(n=>n.tag==='a'&&n.attrs.href===CAREERS_URL&&/current openings/i.test(home.text(n))).length>0,'Official careers handoff missing')
  const careers=await read(CAREERS_URL)
  requireNative(careers.nodes(n=>n.tag==='h1'&&/Boost Your Professional Journey/.test(careers.text(n))).length===1,'Careers page identity changed')
  firstParty=true
  const scripts=careers.nodes(n=>n.tag==='script'&&!n.attrs.src&&/\bconst\s+ROLES\s*=/.test(n.raw||''))
  requireNative(scripts.length===1,'Native role client missing or ambiguous')
  const raw=scripts[0].raw.replace(/\r/g,''),declarations=[...raw.matchAll(/\bconst\s+ROLES\s*=\s*/g)]
  requireNative(declarations.length===1,'Native role array ambiguous')
  const start=declarations[0].index+declarations[0][0].length,tail=raw.slice(start),ending=/^\s*\];/m.exec(tail)
  requireNative(ending&&tail[0]==='[','Native role literal unavailable')
  const roles=parseJavaScriptLiteral(tail.slice(0,ending.index+ending[0].length-1).trim())
  checkDeadline()
  requireNative(Array.isArray(roles)&&roles.length>0&&roles.length<=200,'Unverified empty or changed native roles')
  requireNative(raw.includes(APPLICATION_URL)&&raw.includes('ROLES.filter(')&&raw.includes('ROLES.indexOf(r)'),'Native renderer/application contract changed')
  const form=await read(APPLICATION_URL)
  const formHead=activeHead(retainedResponses.at(-1).body)
  checkDeadline()
  requireNative(formHead.titles.length===1&&/EaseMyTrip\.com/.test(formHead.titles[0])&&/This form was created inside\s+EaseMyTrip\.com/.test(form.text(form.root)),'Native application employer changed')
  const seen=new Set(),facts=roles.map((r,index)=>{
   checkDeadline()
   requireNative(r&&typeof r==='object'&&Object.keys(r).every(k=>['title','dept','loc','type','about','process','exp','resp','profile'].includes(k)),'Unreviewed role fields')
   for(const key of ['title','dept','loc','type','exp'])requireNative(typeof r[key]==='string'&&r[key].trim(),'Missing native '+key)
   requireNative(r.about==null||typeof r.about==='string','Changed native description')
   for(const key of ['process','resp','profile'])requireNative(Array.isArray(r[key])&&r[key].every(v=>typeof v==='string'),'Changed native '+key)
   const title=activeText(r.title),location=activeText(r.loc),key=title+'\n'+location
   requireNative(title&&location&&!seen.has(key),'Duplicate or missing native role identity');seen.add(key)
   return{nativeIndex:index,title,location,country:null,department:activeText(r.dept),employmentType:activeText(r.type),experience:activeText(r.exp),description:description(r),sourceUrl:CAREERS_URL,applyUrl:APPLICATION_URL,postingDate:null,closingDate:null,nativeRecord:r,sourceScopeComplete:false,lifecycleCleanupAllowed:false}
  })
  checkDeadline()
  return{roles:facts,retainedResponses,inventoryEvidence:{...evidence(),reportedTotal:facts.length}}
 }
 try{return await Promise.race([inspect(),interrupted])}
 catch(error){if(signal?.aborted)throw signal.reason;throw Object.assign(new Error('EaseMyTrip native coverage gap: '+error.message,{cause:error}),{code:'EASEMYTRIP_COVERAGE_GAP',inventoryEvidence:evidence()})}
 finally{clearTimeout(timer);combined.removeEventListener('abort',listener);controller.abort(Error('EaseMyTrip inspection ended'))}
}
export const run=async options=>{
 const inspected=await inspectInventory(options)
 const eligibleLocations=inspected.roles.filter(role=>isNativeBareCityInPublicScope(role.location))
 const jobs=attachInventoryEvidence(eligibleLocations.map(role=>({
  ...role,source:SOURCE,company:COMPANY,city:getValidIndiaCityForJob({country:null,location:role.location}),
  jobId:null,requisitionId:null,applicationUrlIsGeneric:true,link:role.applyUrl,
  sourceDescription:role.description,jobDescription:role.description,
  sourceDetailComplete:role.description!==null,sourceDetailStatus:role.description===null?'missing-description':'complete',
  sourceEmploymentType:role.employmentType,sourceExperienceRequired:role.experience,experienceRequired:role.experience,
  postedAt:null,sourceListingComplete:false,sourceGeographyComplete:false,
 })),{...inspected.inventoryEvidence,reason:inspected.inventoryEvidence.reason+`; ${eligibleLocations.length} satisfy existing public city/Remote policy with country and publication date preserved as null`})
 Object.defineProperty(jobs,'nativeCollectionEvidence',{value:inspected})
 return jobs
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')

  if (isDryRun) {
    saveToFile(jobs, path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
