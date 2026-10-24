import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
const load=path=>JSON.parse(gunzipSync(readFileSync(new URL(path,import.meta.url))))
const native=['official-pages','linkedin-pages'].flatMap(name=>load('./fixtures/'+name+'.json.gz'))
const identities=load('../parkpluscompany/fixtures/identity-pages.json.gz')
export const fixtureFetch=(mutate=r=>r)=>async url=>{
 const original=[...native,...identities].find(r=>r.url===url)
 if(!original)throw Error('Uncaptured Park+ URL '+url)
 const row=mutate(structuredClone(original)),response=new Response(row.body,{status:row.status})
 Object.defineProperty(response,'url',{value:row.finalUrl});return response
}
