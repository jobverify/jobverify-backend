import {HOME,CAREERS,SEARCH,CLIENT,CORE,parseCargillSearch,buildCargillSearchURL,parseCargillPage,parseCargillOfficialRole,parseCargillRmkDetail} from './nativeContract.js'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const prove=(ok,message)=>{if(!ok)throw Error('Cargill native run: '+message)}
export async function runNativeCargill(options={}){
 prove(options.maxJobs==null,'Truncated native extraction is not permitted');const fetchImpl=options.fetchImpl??globalThis.fetch,timeoutMs=options.timeoutMs??180000,now=typeof options.now==='function'?options.now():options.now??new Date().toISOString();prove(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=300000&&Number.isFinite(Date.parse(now)),'Invalid bounded extraction options')
 const c=new AbortController(),timer=setTimeout(()=>c.abort(Error('Cargill source deadline')),timeoutMs),signal=options.signal?AbortSignal.any([options.signal,c.signal]):c.signal,abort=()=>signal.throwIfAborted()
 async function bounded(fn){abort();let listener;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{listener=()=>reject(signal.reason);signal.addEventListener('abort',listener,{once:true})})])}finally{signal.removeEventListener('abort',listener);abort()}}
 async function get(url,kind){const r=await bounded(()=>fetchImpl(url,{signal,headers:{Accept:'text/html,application/json,application/javascript','User-Agent':'Mozilla/5.0'},redirect:'follow'}));prove(r.status===200,'Native HTTP failure');if(kind==='careers')prove(r.url===CAREERS+'en','Current official careers redirect changed');else if(kind==='sap')prove(new URL(r.url).origin==='https://jobs.cargill.com','Current SAP application handoff changed');else prove(r.url===url,'Native final URL changed');const body=await bounded(()=>r.text());prove(typeof body==='string'&&body.length<=3000000,'Native body invalid');return{body,url:r.url}}
 try{
  const home=await get(HOME),careers=await get(CAREERS,'careers'),search=await get(SEARCH),client=await get(CLIENT),core=await get(CORE),surface=parseCargillSearch(home.body,careers.body,search.body,client.body,core.body),rows=[]
  const pages=Math.ceil(surface.total/15);for(let page=1;page<=pages;page++)rows.push(...parseCargillPage(JSON.parse((await get(buildCargillSearchURL(page,surface.total))).body),page,surface.total).jobs)
  prove(rows.length===surface.total&&new Set(rows.map(j=>j.publicJobId)).size===rows.length,'Native all-page identity/count drift')
  const jobs=[];for(let i=0;i<rows.length;i+=3)jobs.push(...await Promise.all(rows.slice(i,i+3).map(async row=>{const official=parseCargillOfficialRole((await get(row.sourceUrl)).body,row,{now}),native=await get(official.applicationURL,'sap');return parseCargillRmkDetail(native.body,native.url,official,{now})})))
  prove(new Set(jobs.map(j=>j.jobId)).size===jobs.length&&new Set(jobs.map(j=>j.nativeRmkPublicId)).size===jobs.length,'Native cross-surface duplicate requisitions')
  const final=[];for(let page=1;page<=pages;page++)final.push(...parseCargillPage(JSON.parse((await get(buildCargillSearchURL(page,surface.total))).body),page,surface.total).jobs)
  prove(JSON.stringify(rows)===JSON.stringify(final),'Native full India-filter inventory drift');abort()
  for(const job of jobs){job.sourceObservedIndiaJobCount=rows.length;job.sourceGlobalJobCount=null;job.sourceNativeFacet='India country 1269750';job.sourceDisplayedGlobalCount=surface.globalDisplayedTotal}
  return attachInventoryEvidence(jobs,{status:'coverage-gap',surface:SEARCH,firstParty:true,listingComplete:false,pagesFetched:pages*2,reportedTotal:null,indiaFacetCount:surface.total,verifiedAt:now,reason:'current-official-India-country-filter-enumerated-company-wide-scope-unproven'})
 }finally{clearTimeout(timer)}
}
