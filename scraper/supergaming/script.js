import { document } from '../../scraper-support/shared/rmkNativePairHtml.js'
import { activeHead } from '../../scraper-support/utils/activeNativeHtml.js'
import { normalizeInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

export const CAREERS_URL = 'https://www.supergaming.com/careers'
export const CONTACT_EMAIL = 'careers@supergaming.com'

const gap = (reason, now, {message,firstParty=false,contactEmail=null,cause,pagesFetched=0}={}) => Object.assign(
  new Error(message || `SuperGaming current inventory is not enumerable: ${reason}`, {cause}),
  {code:'SUPERGAMING_COVERAGE_GAP',reason,contactEmail,inventoryEvidence:normalizeInventoryEvidence({
    status:'coverage-gap',surface:CAREERS_URL,firstParty,listingComplete:false,
    reportedTotal:null,indiaFacetCount:null,verifiedAt:now(),reason,pagesFetched,
  })})

export const run = async ({fetchImpl=fetch,signal,timeoutMs=20000,now=()=>new Date().toISOString()}={}) => {
  signal?.throwIfAborted()
  if(!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('SuperGaming invalid aggregate deadline')
  const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal
  let timer,listener
  const interrupted=new Promise((_,reject)=>{
    listener=()=>reject(combined.reason)
    combined.addEventListener('abort',listener,{once:true})
    timer=setTimeout(()=>controller.abort(Error('SuperGaming aggregate deadline exceeded')),timeoutMs)
  })
  const inspect=async()=>{
    let response,html
    try{
      combined.throwIfAborted()
      response=await fetchImpl(CAREERS_URL,{signal:combined,redirect:'error',headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}})
      combined.throwIfAborted()
      if(response.status!==200||response.url!==CAREERS_URL)throw Error('SuperGaming native HTTP status or final identity changed')
      html=await response.text()
      combined.throwIfAborted()
    }catch(error){
      combined.throwIfAborted()
      throw gap('upstream-unavailable',now,{message:error.message,cause:error})
    }
    if(typeof html!=='string'||html.length>5000000)throw gap('unrecognized-careers-response',now,{pagesFetched:1})
    const head=activeHead(html)
    if(head.titles.length!==1||head.titles[0]!=='Careers \u2014 SuperGaming')throw gap('unrecognized-careers-response',now,{pagesFetched:1})
    const doc=document(html)
    const prune=(node,inherited=false)=>{
      node.inactive ||= inherited||/(?:^|;)\s*content-visibility\s*:\s*hidden\s*(?:!important\s*)?(?:;|$)/i.test(node.attrs?.style||'')
      node.children.filter(child=>typeof child!=='string').forEach(child=>prune(child,node.inactive))
    }
    prune(doc.root)
    const email=doc.nodes(n=>n.tag==='a'&&n.attrs.href?.startsWith('mailto:')).map(n=>n.attrs.href.split('?')[0].slice(7))
      .find(address=>address===CONTACT_EMAIL)
    throw gap(email?'unstructured-email-recruiting':'unreviewed-hiring-surface',now,{firstParty:true,contactEmail:email||null,pagesFetched:1})
  }
  try{return await Promise.race([inspect(),interrupted])}
  finally{clearTimeout(timer);combined.removeEventListener('abort',listener);controller.abort(Error('SuperGaming inspection ended'))}
}
