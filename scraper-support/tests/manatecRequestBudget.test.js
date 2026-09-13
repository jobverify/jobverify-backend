import assert from 'node:assert/strict'
import test from 'node:test'
import {fetchPageWithWwwFallback,run,HOMEPAGE_URL} from '../../scraper/manatecelectronics/script.js'
const delayed=value=>new Promise(resolve=>setTimeout(()=>resolve(value),60))
const response={status:200,url:HOMEPAGE_URL,text:async()=>'<html>Body</html>'}
const connectTimeout=()=>Object.assign(new Error('fetch failed'),{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}})
test('Manatec request deadline also bounds a fetcher that ignores cancellation',async()=>{
 await assert.rejects(fetchPageWithWwwFallback(HOMEPAGE_URL,{timeoutMs:10,fetchImpl:async()=>delayed(response)}),{code:'MANATEC_INVENTORY_UNAVAILABLE'})
})
test('Manatec deadline covers response body consumption',async()=>{
 await assert.rejects(fetchPageWithWwwFallback(HOMEPAGE_URL,{timeoutMs:10,fetchImpl:async()=>({...response,text:()=>delayed('body')})}),{code:'MANATEC_INVENTORY_UNAVAILABLE'})
})
test('Manatec preserves the existing www fallback for an immediate connection timeout',async()=>{
 const requests=[];const result=await fetchPageWithWwwFallback(HOMEPAGE_URL,{fetchImpl:async url=>{requests.push(url);if(requests.length===1)throw connectTimeout();return {...response,url}}})
 assert.deepEqual(requests,[HOMEPAGE_URL,'https://www.manatec.in/']);assert.equal(result.url,'https://www.manatec.in/')
})
test('Manatec apex and www fallback share one request budget',async()=>{
 let calls=0
 await assert.rejects(fetchPageWithWwwFallback(HOMEPAGE_URL,{timeoutMs:15,fetchImpl:async()=>{calls++;if(calls===1)throw connectTimeout();return delayed(response)}}),{code:'MANATEC_INVENTORY_UNAVAILABLE'})
 assert.equal(calls,2)
})
test('Manatec caller cancellation stops a pending body with the original reason',async()=>{
 const controller=new AbortController(),reason=new Error('Manatec stopped')
 await assert.rejects(fetchPageWithWwwFallback(HOMEPAGE_URL,{signal:controller.signal,fetchImpl:async()=>({...response,text:async()=>{controller.abort(reason);return delayed('body')}})}),error=>error===reason)
})
test('Manatec preaborted run invokes no transport',async()=>{
 let calls=0;const reason=new Error('Stop source')
 await assert.rejects(run({signal:AbortSignal.abort(reason),fetchPage:async()=>{calls++;throw connectTimeout()}}),error=>error===reason);assert.equal(calls,0)
})
test('Manatec run bounds an injected hung page and stops on first outage',async()=>{
 let calls=0;await assert.rejects(run({timeoutMs:10,fetchPage:async()=>{calls++;return delayed(response)}}),{code:'MANATEC_INVENTORY_UNAVAILABLE'});assert.equal(calls,1)
})
test('Manatec HTTP403 preserves saved jobs and does not query further routes',async()=>{
 let calls=0;await assert.rejects(run({fetchPage:async()=>{calls++;return{status:403,html:'Forbidden'}}}),{code:'MANATEC_INVENTORY_UNAVAILABLE'});assert.equal(calls,1)
})
