import {readNativeDocument} from '../carrier.workday/nativeHtml.js'
export const CORPORATE='https://www.corporate.carrier.com/',HOME='https://www.carrier.com/us/en/',PRIVACY=HOME+'privacy-notice/',CAREERS=HOME+'careers/'
const prove=(ok,message)=>{if(!ok)throw Error('Carrier Global current group delegation: '+message)}
export async function verifyCarrierGroupDelegation({fetchPage,signal=AbortSignal.timeout(30000)}={}){
 async function get(url,expected){signal.throwIfAborted();let listener
  try{const p=await Promise.race([(async()=>{if(fetchPage)return fetchPage(url,{signal});const r=await fetch(url,{signal,redirect:url===CORPORATE?'follow':'error',headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}});return{status:r.status,url:r.url,body:await r.text()}})(),new Promise((_,reject)=>{listener=()=>reject(signal.reason);signal.addEventListener('abort',listener,{once:true})})]);signal.throwIfAborted();prove(p?.status===200&&p.url===expected&&typeof p.body==='string'&&p.body.length<=2000000,'HTTP/final corporate URL unavailable');const d=readNativeDocument(p.body),c=d.nodes(n=>n.tag==='link'&&n.attrs.rel==='canonical');prove(c.length===1&&c[0].attrs.href===expected,'Current corporate canonical missing');return d}finally{signal.removeEventListener('abort',listener);signal.throwIfAborted()}
 }
 const links=(d,base)=>d.nodes(n=>n.tag==='a'&&n.attrs.href).flatMap(n=>{try{return[new URL(n.attrs.href,base).href]}catch{return[]}}),body=d=>d.text(d.nodes(n=>n.tag==='root')[0])
 const corporate=await get(CORPORATE,HOME)
 prove(corporate.nodes(n=>n.tag==='title').some(n=>n.raw==='Intelligent Climate and Energy Solutions | Carrier')&&body(corporate).includes('Carrier Global Corporation (NYSE: CARR)'),'Current Carrier Global corporate identity missing')
 prove(links(corporate,HOME).includes(CAREERS)&&links(corporate,HOME).includes(PRIVACY),'Current corporate career/privacy handoff missing')
 const privacy=await get(PRIVACY,PRIVACY)
 prove(/Carrier Global Corporation and its subsidiaries and affiliates \(collectively, [“"]Carrier[”"]\)/.test(body(privacy))&&links(privacy,PRIVACY).includes(CAREERS),'Current collective Carrier group name and careers relationship missing')
 return{relationship:'same-official-group-recruiting-surface',canonicalSource:'carrier',legalEmployerAlias:false,companyScopeComplete:false,corporateURL:CORPORATE,finalCorporateURL:HOME,privacyURL:PRIVACY,careersURL:CAREERS}
}
