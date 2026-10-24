import {HOME,CAREERS,SEARCH,CLIENT,CORE,parseCargillSearch,buildCargillSearchURL,parseCargillPage,parseCargillOfficialRole,parseCargillRmkDetail} from './nativeContract.js'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {cargillGuardError,tagCargillError,cargillHttpCode,cargillTransportCode,parseCargillJson,parseCargillAtStage} from './nativeErrors.js'
const prove=(ok,message,code)=>{if(!ok){const error=cargillGuardError('RUN',message);if(code)Object.defineProperty(error,'code',{value:code,writable:true,configurable:true,enumerable:true});throw error}}
export async function runNativeCargill(options={}){
 prove(options.maxJobs==null,'Truncated native extraction is not permitted');const fetchImpl=options.fetchImpl??globalThis.fetch,timeoutMs=options.timeoutMs??180000,now=typeof options.now==='function'?options.now():options.now??new Date().toISOString();prove(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=300000&&Number.isFinite(Date.parse(now)),'Invalid bounded extraction options')
 const c=new AbortController(),timer=setTimeout(()=>c.abort(tagCargillError(Error('Cargill source deadline'),'CARGILL_RUN_SOURCE_DEADLINE')),timeoutMs),signal=options.signal?AbortSignal.any([options.signal,c.signal]):c.signal,abort=()=>{try{signal.throwIfAborted()}catch(error){throw tagCargillError(error,'CARGILL_RUN_ABORTED')}}
 async function bounded(fn){
  abort();let listener,settlementTimer
  const operation=Promise.resolve().then(fn)
  try{return await Promise.race([operation,new Promise((_,reject)=>{listener=()=>reject(signal.reason);signal.addEventListener('abort',listener,{once:true})})])}
  catch(error){
   if(signal.aborted)await Promise.race([
    operation.then(()=>{},()=>{}),
    new Promise(resolve=>{settlementTimer=setTimeout(resolve,1000)}),
   ])
   throw error
  }finally{clearTimeout(settlementTimer);signal.removeEventListener('abort',listener);abort()}
 }
 async function get(url,kind){let r;try{r=await bounded(()=>fetchImpl(url,{signal,headers:{Accept:'text/html,application/json,application/javascript','User-Agent':'Mozilla/5.0'},redirect:'follow'}))}catch(error){throw tagCargillError(error,cargillTransportCode('fetch',kind,error))}try{prove(r.status===200,'Native HTTP failure',cargillHttpCode(kind,r.status));if(kind==='careers')prove(r.url===CAREERS+'en','Current official careers redirect changed');else if(kind==='sap')prove(new URL(r.url).origin==='https://jobs.cargill.com','Current SAP application handoff changed');else prove(r.url===url,'Native final URL changed');}catch(error){Object.assign(error,{status:r.status,requestUrl:url,finalUrl:r.url,stage:kind});if([202,401,403,429,451].includes(r.status))Object.assign(error,{softFailure:true,upstreamOutage:false,failureKind:'blocked_or_access_denied',abortRetries:true});error.message+='; HTTP '+r.status+' at '+kind+' for '+url+'; final URL '+r.url;throw error}let body;try{body=await bounded(()=>r.text())}catch(error){throw tagCargillError(error,cargillTransportCode('body',kind,error))}prove(typeof body==='string'&&body.length<=3000000,'Native body invalid');return{body,url:r.url}}
 try{
  const home=await get(HOME,'home'),careers=await get(CAREERS,'careers'),search=await get(SEARCH,'search'),client=await get(CLIENT,'client'),core=await get(CORE,'core'),surface=parseCargillAtStage(()=>parseCargillSearch(home.body,careers.body,search.body,client.body,core.body),'bootstrap'),rows=[]
  const pages=Math.ceil(surface.total/15);for(let page=1;page<=pages;page++){const body=(await get(buildCargillSearchURL(page,surface.total),'listing')).body;rows.push(...parseCargillAtStage(()=>parseCargillPage(parseCargillJson(body,'listing'),page,surface.total),'listing').jobs)}
  prove(rows.length===surface.total&&new Set(rows.map(j=>j.publicJobId)).size===rows.length,'Native all-page identity/count drift')
  const jobs=[];for(let i=0;i<rows.length;i+=3){
   let failed=false,firstFailure
   const settled=await Promise.allSettled(rows.slice(i,i+3).map(async row=>{
    try{const body=(await get(row.sourceUrl,'official')).body,official=parseCargillAtStage(()=>parseCargillOfficialRole(body,row,{now}),'official'),native=await get(official.applicationURL,'sap');return parseCargillAtStage(()=>parseCargillRmkDetail(native.body,native.url,official,{now}),'sap')}
    catch(error){if(!failed){failed=true;firstFailure=error;c.abort(error)}throw error}
   }))
   if(failed)throw firstFailure
   jobs.push(...settled.map(result=>result.value))
  }
  prove(new Set(jobs.map(j=>j.jobId)).size===jobs.length&&new Set(jobs.map(j=>j.nativeRmkPublicId)).size===jobs.length,'Native cross-surface duplicate requisitions')
  const final=[];for(let page=1;page<=pages;page++){const body=(await get(buildCargillSearchURL(page,surface.total),'recheck')).body;final.push(...parseCargillAtStage(()=>parseCargillPage(parseCargillJson(body,'recheck'),page,surface.total),'recheck').jobs)}
  prove(JSON.stringify(rows)===JSON.stringify(final),'Native full India-filter inventory drift');abort()
  for(const job of jobs){job.sourceObservedIndiaJobCount=rows.length;job.sourceGlobalJobCount=null;job.sourceNativeFacet='India country 1269750';job.sourceDisplayedGlobalCount=surface.globalDisplayedTotal}
  return attachInventoryEvidence(jobs,{status:'coverage-gap',surface:SEARCH,firstParty:true,listingComplete:false,pagesFetched:pages*2,reportedTotal:null,indiaFacetCount:surface.total,verifiedAt:now,reason:'current-official-India-country-filter-enumerated-company-wide-scope-unproven'})
 }catch(error){if(!c.signal.aborted)c.abort(error);throw error}finally{clearTimeout(timer)}
}
