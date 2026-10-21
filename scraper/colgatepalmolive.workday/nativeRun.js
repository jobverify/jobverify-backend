import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {CORPORATE,SEARCH,API,check,verifyCorporate,verifySearch,checkEnvelope,parsePage,parseDetail} from './nativeContract.js'
const client=JSON.parse(fs.readFileSync(new URL('./nativeClient.json',import.meta.url)))
export async function runNative(options={}){
 const now=new Date(options.now??Date.now()).toISOString(),timeout=options.timeoutMs??180000
 check(options.maxJobs==null,'Truncated extraction is unsupported');check(Number.isSafeInteger(timeout)&&timeout>0&&timeout<=240000,'Invalid extraction deadline')
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(Error('Colgate deadline exceeded')),timeout),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal
 let cookie='',nonce=''
 async function request(url,body){
  signal.throwIfAborted();let onAbort
  const aborted=new Promise((_,reject)=>{onAbort=()=>reject(signal.reason);signal.addEventListener('abort',onAbort,{once:true})})
  try{return await Promise.race([aborted,(async()=>{
   const headers={'Accept':body?'application/json':'text/html,application/javascript,application/json'}
   if(body){headers['Content-Type']='application/json';headers['X-CSRF-Token']=nonce;if(cookie)headers.Cookie=cookie}
   const r=await fetch(url,{method:body?'POST':'GET',body:body?JSON.stringify(body):undefined,headers,signal,redirect:'error'})
   signal.throwIfAborted();check(r.status===200&&r.url===url,'Native HTTP status or final URL mismatch')
   if(url===SEARCH)cookie=(r.headers.getSetCookie?.()??[]).map(s=>s.split(';')[0]).join('; ')
   const text=await r.text();signal.throwIfAborted();check(Buffer.byteLength(text)<=5000000,'Native response exceeds bounded size');return text
  })()])}finally{signal.removeEventListener('abort',onAbort)}
 }
 const json=async body=>{const d=JSON.parse(await request(API,body));checkEnvelope(d);return d}
 const payload=pageNumber=>({locale:'en_US',pageNumber,sortBy:'date',keywords:'',location:'',facetFilters:{filter1:['India']},brand:'',skills:[],categoryId:0})
 try{
  signal.throwIfAborted();verifyCorporate(await request(CORPORATE));nonce=verifySearch(await request(SEARCH))
  for(const asset of client.assets)check(createHash('sha256').update(await request(asset.url)).digest('hex')===asset.sha256,'Advertised native client changed; review required')
  const facets=await json({facetingOnly:true,categoryId:0,brand:'',locale:'en_US',keywords:'',location:'',facetFields:['filter5','filter1','filter2','sfstd_jobLocation_obj','businessUnit_obj','filter12','filter7','StudentOpp'],facetFilters:{},skills:[]})
  check(Array.isArray(facets.facetFields),'Native facets missing')
  const countries=facets.facetFields.filter(f=>f.name==='filter1');check(countries.length===1&&Array.isArray(countries[0].values),'Native country facet missing')
  const india=countries[0].values.filter(v=>v.name==='India');check(india.length===1&&Number.isSafeInteger(india[0].count)&&india[0].count>=0,'Native India facet count unavailable')
  const pages=[await json(payload(0))],first=parsePage(pages[0],0,now,india[0].count),rows=[...first.rows]
  for(let page=1;page<Math.ceil(first.total/10);page++){pages.push(await json(payload(page)));rows.push(...parsePage(pages[page],page,now,first.total).rows)}
  check(rows.length===first.total&&new Set(rows.map(r=>r.id)).size===rows.length,'Native duplicate or incomplete inventory')
  const jobs=[];for(const row of rows)jobs.push(parseDetail(await request(row.sourceURL),row,now))
  for(let page=0;page<pages.length;page++)check(JSON.stringify(await json(payload(page)))===JSON.stringify(pages[page]),'Native inventory changed during extraction')
  signal.throwIfAborted()
  for(const job of jobs){job.sourceObservedIndiaFacetCount=first.total;job.nativeClientBuild=client.observedWidgetBuild}
  return attachInventoryEvidence(jobs,{status:'coverage-gap',surface:SEARCH,firstParty:true,listingComplete:false,pagesFetched:pages.length,reportedTotal:null,indiaFacetCount:null,verifiedAt:now,reason:'Complete stable observed India facet; whole company and other public recruiting surfaces are unproven'})
 }finally{clearTimeout(timer);controller.abort();cookie='';nonce=''}
}
