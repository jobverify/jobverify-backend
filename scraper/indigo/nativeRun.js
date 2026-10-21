import {CORPORATE,BOARD,API,REMOTE_ENTRY,APP,verifyIndigoBinding,readIndigoJobs} from './nativeContract.js'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const check=(ok,message)=>{if(!ok)throw new Error('Indigo current native inventory: '+message)}
export async function runNativeIndigo(options={}){
 const {fetchImpl=globalThis.fetch}=options,timeoutMs=options.timeoutMs??90000,cap=options.maxJobs??Infinity
 check(Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=180000,'Invalid bounded deadline');check(cap===Infinity||Number.isInteger(cap)&&cap>=0,'Invalid job cap')
 const now=typeof options.now==='function'?options.now():options.now??new Date().toISOString();check(Number.isFinite(Date.parse(now)),'Invalid check time')
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new Error('Indigo source deadline')),timeoutMs),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal
 const abort=()=>{if(signal.aborted)throw signal.reason||new Error('Caller aborted')}
 async function bounded(fn){abort();let listener;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{listener=()=>reject(signal.reason||new Error('Caller aborted'));signal.addEventListener('abort',listener,{once:true})})])}finally{signal.removeEventListener('abort',listener);abort()}}
 async function get(url,headers={}){const response=await bounded(()=>fetchImpl(url,{signal,redirect:'follow',headers:{Accept:'text/html,application/json,application/javascript',Origin:'https://www.goindigo.in',Referer:BOARD,...headers}}));check(response.status===200&&response.url===url,'Native HTTP status or URL changed');const body=await bounded(()=>response.text());check(typeof body==='string'&&body.length<=8000000,'Native response content invalid');return body}
 try{
  const corporate=await get(CORPORATE),board=await get(BOARD),remote=await get(REMOTE_ENTRY),app=await get(APP),config=verifyIndigoBinding(corporate,board,remote,app)
  const fetchRows=async()=>{const payload=JSON.parse(await get(API,{user_key:config.userKey}));return{payload,jobs:readIndigoJobs(payload,{now,config})}}
  const first=await fetchRows(),last=await fetchRows();check(JSON.stringify(first.payload)===JSON.stringify(last.payload),'Native full response changed during collection')
  const jobs=first.jobs,missing=jobs.some(j=>!j.sourceDetailComplete),capped=cap<jobs.length,complete=!missing&&!capped
  abort();return attachInventoryEvidence(jobs.slice(0,cap).map(j=>({...j,sourceListingComplete:complete})),{status:complete?(jobs.length?'complete-inventory':'verified-empty'):'coverage-gap',surface:API,firstParty:true,listingComplete:complete,pagesFetched:2,reportedTotal:jobs.length,indiaFacetCount:jobs.length,verifiedAt:now,reason:missing?'native-full-description-placeholder-or-missing':capped?'caller-cap':'current-public-client-all-result-array-local-pagination-and-stable-feed'})
 }finally{clearTimeout(timer)}
}
