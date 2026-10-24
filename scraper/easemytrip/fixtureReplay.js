import {readFileSync} from 'node:fs'
const records=['official-home','official-careers','native-application-form'].map(name=>JSON.parse(readFileSync(new URL('./fixtures/'+name+'.json',import.meta.url),'utf8')))
export const fixtureFetch=(mutate=record=>record)=>async url=>{
 const captured=records.find(r=>r.url===url)
 if(!captured)throw Error('Uncaptured EaseMyTrip URL '+url)
 const row=mutate(structuredClone(captured)),response=new Response(row.body,{status:row.status})
 Object.defineProperty(response,'url',{value:row.finalUrl});return response
}
