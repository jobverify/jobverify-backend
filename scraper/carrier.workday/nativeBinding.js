import {readNativeDocument,extractActiveDescription,decodeNativeHtml} from './nativeHtml.js'
export const HOME='https://www.carrier.com/us/en/careers/',CAREERS='https://jobs.carrier.com/en',BOARD='https://carrier.wd5.myworkdayjobs.com/jobs'
// This observed current public role is a binding sentinel, never an invented URL.
// If it closes or moves, fail rather than certifying an empty or stale board.
export const ROLE='https://jobs.carrier.com/en/job/hyderabad/salesforce-developer-with-cpq/29289/101934204896'
export const EMPLOYER_PATTERN=/^(?:4040 Carrier Technologies India Limited|4010 Carrier Airconditioning & Refrigeration Ltd|4020 EcoEnergy Insights Limited)$/
const check=(ok,message)=>{if(!ok)throw Error('Carrier current native binding: '+message)},norm=value=>String(value??'').replace(/\s+/g,' ').trim()
async function bounded(signal,fn){signal.throwIfAborted();let listener;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{listener=()=>reject(signal.reason);signal.addEventListener('abort',listener,{once:true})})])}finally{signal.removeEventListener('abort',listener);signal.throwIfAborted()}}
export async function verifyCarrierBinding({fetchPage,signal=AbortSignal.timeout(30000),now=new Date().toISOString()}={}){
 check(Number.isFinite(Date.parse(now)),'Invalid current time')
 async function get(url){const p=await bounded(signal,async()=>{if(fetchPage)return fetchPage(url,{signal});const r=await fetch(url,{signal,redirect:'error',headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}});return{status:r.status,url:r.url,body:await r.text()}});check(p?.status===200&&p.url===url&&typeof p.body==='string'&&p.body.length<=2000000,'Current official HTTP or final URL unavailable');const d=readNativeDocument(p.body),c=d.nodes(n=>n.tag==='link'&&n.attrs.rel==='canonical');check(c.length===1&&c[0].attrs.href===url,'Current corporate canonical missing');return d}
 const links=(d,base)=>d.nodes(n=>n.tag==='a'&&typeof n.attrs.href==='string').flatMap(n=>{try{const u=new URL(n.attrs.href,base);return u.protocol==='https:'&&!u.username&&!u.password?[u.href]:[]}catch{return[]}})
 const home=await get(HOME);check(home.nodes(n=>n.tag==='title').some(n=>norm(n.raw)==='Careers | Carrier')&&links(home,HOME).includes(CAREERS),'Current corporate careers handoff missing')
 const careers=await get(CAREERS);check(careers.nodes(n=>n.tag==='title').some(n=>norm(n.raw)==='Working at Carrier')&&links(careers,CAREERS).includes(BOARD+'/login'),'Current native board handoff missing')
 const role=await get(ROLE),title='Salesforce Developer with CPQ';check(role.nodes(n=>n.tag==='h1').some(n=>role.text(n)===title)&&role.nodes(n=>n.tag==='title').some(n=>norm(n.raw)===title+' at Carrier'),'Current public role title missing')
 const applications=[...new Set(links(role,ROLE).filter(value=>{const u=new URL(value);return u.origin===new URL(BOARD).origin&&/^\/jobs\/job\/[^/]+\/[^/]+_30220084\/apply$/.test(u.pathname)&&!u.search&&!u.hash}))];check(applications.length===1,'Current exact public application handoff missing')
 return{officialURL:HOME,careersURL:CAREERS,boardURL:BOARD,publicRoleURL:ROLE,title,nativeRequisitionId:'30220084',nativeCanonicalURL:applications[0].slice(0,-6),region:'India',companyScopeComplete:false,checkedAt:now}
}
export function validateCarrierMappedJobs(jobs,binding){
 check(Array.isArray(jobs),'Expected native jobs')
 for(const job of jobs){
  check(job.source==='carrier'&&job.company==='Carrier'&&EMPLOYER_PATTERN.test(job.nativeEmployer)&&job.country==='India'&&job.sourceDetailComplete===true,'Native regional employer/country/content mismatch')
  const active=extractActiveDescription(job.sourceDescription)
  check(active&&norm(active)===norm(decodeNativeHtml(job.jobDescription)),'Native full role description is inactive or inconsistent')
  const sentences=active.split(/(?<=[.!?])\s+/)
  check(!sentences.some(s=>/^(?:this|the)\s+(?:job|position|vacancy)\s+is\s+(?:no longer available|closed|not available)\b/i.test(s)),'Native role description explicitly closes the position')
  const substantive=sentences.filter(s=>!/^(?:please\s+)?(?:click\s+)?apply\s+now\b.*\b(?:view|learn|description|application)\b/i.test(s)&&!/^(?:the\s+)?(?:full\s+|detailed\s+)?job description\b.*\b(?:unavailable|not available|available soon|coming soon)\b/i.test(s)&&!/^please\s+check back\b/i.test(s)).join(' ').replace(/\b(?:job description|apply now|sample|placeholder|read more|coming soon)\b/gi,'').replace(/[^\p{L}\p{N}]/gu,'')
  check(substantive.length>=40,'Native full role description is only an unavailable notice or application instruction')
 }
 const selected=jobs.filter(j=>j.requisitionId===binding.nativeRequisitionId);check(selected.length===1&&selected[0].title===binding.title&&selected[0].link===binding.nativeCanonicalURL,'Current public application and native inventory identity disagree');
 return jobs
}
