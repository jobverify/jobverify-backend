import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {SEARCH_URL,inspectSearch,listingUrl,parsePage,parseDetail} from './nativeContract.js'
export const SOURCE='disney'
export const COMPANY='Disney'
export const CAREERS_URL=SEARCH_URL

export async function run(options={}){
 const now=new Date(options.now??Date.now());if(!Number.isFinite(now.getTime()))throw Error('Invalid Disney observation clock')
 const signal=options.signal,fetcher=options.fetch??globalThis.fetch
 const timeout=options.timeoutMs??20000
 if(!Number.isFinite(timeout)||timeout<=0||timeout>60000)throw Error('Invalid Disney request timeout')
 const cap=(value,name)=>{if(value!==undefined&&(!Number.isSafeInteger(value)||value<1))throw Error('Invalid Disney '+name);return value??Infinity}
 const maxJobs=cap(options.maxJobs,'job cap'),maxPages=cap(options.maxPages,'page cap')
 function aborted(){if(signal?.aborted)throw signal.reason??Error('Disney extraction aborted')}
 async function get(url){
  aborted();const controller=new AbortController();let timer,onAbort
  const stopped=new Promise((_,reject)=>{onAbort=()=>{const reason=signal?.reason??Error('Disney extraction aborted');controller.abort(reason);reject(reason)};signal?.addEventListener('abort',onAbort,{once:true});timer=setTimeout(()=>{const reason=Error('Disney native HTTP timeout');controller.abort(reason);reject(reason)},timeout)})
  try{return await Promise.race([(async()=>{const response=await fetcher(url,{method:'GET',signal:controller.signal,headers:{accept:'text/html, application/json'}});aborted();if(response?.status!==200||response.url!==url)throw Error('Disney native HTTP status/redirect unavailable');const body=await response.text();aborted();if(typeof body!=='string'||!body.trim())throw Error('Disney native empty response');return body})(),stopped])}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort)}
 }
 const scope=inspectSearch(await get(SEARCH_URL));if(scope.count>maxJobs)throw Error('Disney job cap cannot certify inventory')
 const pages=Math.max(1,Math.ceil(scope.count/10));if(pages>maxPages||pages>100)throw Error('Disney page limit cannot certify inventory')
 const snapshots=[],rows=[],ids=new Set(),reqs=new Set()
 for(let page=1;page<=pages;page++){
  const url=listingUrl(scope,page),parsed=parsePage(await get(url),{scope,page,now})
  for(const row of parsed.rows){if(ids.has(row.id)||(row.req&&reqs.has(row.req)))throw Error('Disney duplicate pagination identity');ids.add(row.id);if(row.req)reqs.add(row.req);rows.push(row)}
  snapshots.push({url,rows:parsed.rows})
 }
 if(rows.length!==scope.count)throw Error('Disney native total mismatch')
 const jobs=[];for(const row of rows)jobs.push(parseDetail(await get(row.url),row,now))
 if(new Set(jobs.map(j=>j.jobId)).size!==jobs.length)throw Error('Disney duplicate detail requisitions')
 for(let index=0;index<snapshots.length;index++){
  const s=snapshots[index],final=parsePage(await get(s.url),{scope,page:index+1,now})
  if(JSON.stringify(final.rows)!==JSON.stringify(s.rows))throw Error('Disney final native listing drift')
 }
 aborted()
 return attachInventoryEvidence(jobs,{status:'coverage-gap',surface:SEARCH_URL,firstParty:true,listingComplete:false,pagesFetched:pages*2,reportedTotal:null,indiaFacetCount:scope.count,verifiedAt:now.toISOString(),reason:'current-Radancy-India-facet-reconciled; whole-employer-and-other-career-surfaces-unproven; original-Radancy-publication-dates-preserved'})
}
