import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const responses=JSON.parse(gunzipSync(readFileSync(new URL('./native-20261027.json.gz',import.meta.url))))
export const frozenResponses=()=>structuredClone(responses)
export const nativeOptions=({mutate,requests=[],source='ola'}={})=>{
  const fixtures=frozenResponses(),counts=new Map()
  return {now:'2026-10-26T22:30:00.000Z',requestIntervalMs:0,fetchImpl:async(url,options={})=>{
    requests.push({url,method:options.method,body:options.body})
    const ordinal=(counts.get(url)||0)+1;counts.set(url,ordinal)
    let response=fixtures[url]
    if(url==='https://olacareers.turbohire.co/careerpage/e0c1eb37-eb7a-4ca4-bcc5-d59ce4ce9212')response=fixtures['https://olacareers.turbohire.co/dashboardv2']
    const changed=mutate?.({url,options,ordinal,response:response?{...response}:null,fixtures,source})
    if(changed)response=changed
    if(!response)throw Error('Unexpected hermetic Ola request '+url)
    return {status:response.status??200,url,contentType:response.contentType,body:response.body}
  }}
}
