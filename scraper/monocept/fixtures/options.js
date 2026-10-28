import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./native-20261027.json.gz',import.meta.url))))
export const nativeFixture=()=>structuredClone(fixture)
export function nativeOptions(mutate=()=>{}){
 const calls=[],counts=new Map()
 const transport=async(url,init={})=>{
  init.signal?.throwIfAborted()
  const packet=structuredClone(fixture.responses[url])
  if(!packet)throw Error('Unexpected Monocept public fixture URL: '+url)
  const index=counts.get(url)||0;counts.set(url,index+1);calls.push({url,method:init.method||'GET',body:init.body})
  mutate(packet,url,index,init)
  return {status:packet.status,url,html:packet.body,headers:new Headers({'Content-Type':packet.contentType}),text:async()=>packet.body}
 }
 return {calls,now:fixture.runAt,requestIntervalMs:0,fetchImpl:transport,fetchPage:transport}
}
