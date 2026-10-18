import {createHash} from 'node:crypto'
// This exact publisher release was reviewed against the native tenant and client consumers.
// A changed client must be re-verified; string/comment matches cannot establish identity.
const CURRENT_CLIENT_SHA256='cfe1aeb6e526cc646e5cdaa4709eb18d3e6ea3898e68cab06c0f7edf2de0099c'
const BOARD_URL='https://jobs.happiestminds.com/happiestminds/'
const invalid=message=>Object.assign(new Error('Happiest Minds current published client identity: '+message),{softFailure:true,upstreamOutage:false,failureKind:'incomplete_listing',abortRetries:true})
const nativeBody=(response,url,limit)=>{
 if(response?.status!==200||response.url!==url||typeof response.html!=='string'||Buffer.byteLength(response.html)>limit)throw invalid('native status, final URL or bounded response changed')
 return response.html
}
export const verifyPublishedZwayamEmployer=async({fetchPage,signal})=>{
 const read=async(url,limit)=>{signal?.throwIfAborted();const response=await fetchPage(url,{signal});signal?.throwIfAborted();return nativeBody(response,url,limit)}
 const portal=(await read(BOARD_URL,256*1024)).replace(/<!--[\s\S]*?-->/g,'')
 if(!/<title>\s*Careers at Happiest Minds\s*\|\s*Join Our Innovative &amp; Dynamic Team\s*<\/title>/i.test(portal)||!/<base\b[^>]*href=["']\/happiestminds\/["'][^>]*>/i.test(portal))throw invalid('current employer portal title or base changed')
 const scripts=[...portal.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m=>new URL(m[1],BOARD_URL))
 const main=scripts.filter(u=>/\/main\.[a-f0-9]{8,64}\.js$/.test(u.pathname))
 if(main.length!==1||main[0].origin!=='https://jobs.happiestminds.com'||!/^\/happiestminds\/main\.[a-f0-9]{8,64}\.js$/.test(main[0].pathname)||main[0].search||main[0].hash||main[0].username||main[0].password)throw invalid('published client handoff is missing, ambiguous or foreign')
 const body=await read(main[0].href,4*1024*1024)
 const clientSha256=createHash('sha256').update(body).digest('hex')
 if(clientSha256!==CURRENT_CLIENT_SHA256)throw invalid('published client release changed; employer tenant requires re-verification')
 const declarations=[...body.matchAll(/(?:^|;)const\s+([A-Za-z_$][\w$]*)=\{COMPANYID:"([^"]+)",COMPANYURL:"([^"]+)",DOMAIN:"([^"]+)",APIENDPOINT:"([^"]+)",APIENDPOINTNEW:"([^"]+)",JOBSHAREURL:"([^"]+)"\};/g)]
 if(declarations.length!==1||[...body.matchAll(/\bCOMPANYID\s*:/g)].length!==1)throw invalid('published tenant binding is missing or ambiguous')
 const binding=declarations[0],prefix=body.slice(0,binding.index)
 if(prefix.lastIndexOf('/*')>prefix.lastIndexOf('*/')||prefix.slice(prefix.lastIndexOf('\n')+1).trimStart().startsWith('//'))throw invalid('tenant binding is commented rather than active client configuration')
 const [,name,companyId,companyUrl,domain,api,apiNew,share]=binding
 if(companyId!=='MTU5NzQ='||companyUrl!=='am9icy5oYXBwaWVzdG1pbmRzLmNvbS8jIS8vbWFuYWdl'||domain!=='jobs.happiestminds.com'||api!=='https://public.zwayam.com/'||apiNew!=='https://public.zwayam.com/'||share!=='https://public.zwayam.com')throw invalid('tenant ID, employer domain or API authority changed')
 for(const key of ['COMPANYID','COMPANYURL','DOMAIN','APIENDPOINT','APIENDPOINTNEW']){
  const usage='sessionStorage.setItem("'+key+'",'+name+'.'+key+')'
  if(!body.includes(usage))throw invalid('tenant binding is not used by the published careers client')
 }
 return{companyId:'15974',domain,boardUrl:BOARD_URL,clientUrl:main[0].href,clientSha256,kind:'current-employer-published-client-binding'}
}
