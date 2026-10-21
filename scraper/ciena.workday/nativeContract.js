import {readNativeDocument} from '../../scraper-support/utils/activeNativeHtml.js'

// These are the observation clocks of the actual official handoff. A later
// native API execution does not refresh the earlier corporate-page evidence.
export const OFFICIAL_BINDING=Object.freeze({officialURL:'https://www.ciena.com/',
 careersURL:'https://www.ciena.com/careers/working-at-ciena',
 boardURL:'https://ciena.wd5.myworkdayjobs.com/Careers',
 observedAt:'2026-10-21T03:18:17.666Z',transport:'current-official-primary-web-active-link-follow',
 ordinaryCorporateHTTPStatus:403,companyScopeComplete:false})

export function validateCienaDescriptions(jobs){
 for(const job of jobs){
  const document=readNativeDocument(job.sourceDescription),root=document.nodes(n=>n.tag==='root')[0]
  // The existing reader retains attributes. Add inherited inert handling here
  // without changing shared helpers pinned by earlier source evidence.
  const mark=(node,inherited=false)=>{if(typeof node==='string')return;node.inert=Boolean(node.inert||inherited||Object.hasOwn(node.attrs,'inert'));for(const child of node.children)mark(child,node.inert)}
  mark(root)
  const active=document.text(root),sentences=active.split(/(?<=[.!?])\s+/)
  if(sentences.some(s=>/^(?:this|the)\s+(?:job|position|vacancy)\s+is\s+(?:no longer available|closed|not available)\b/i.test(s)))throw Error('Ciena native role is explicitly unavailable')
  const substantive=sentences.filter(s=>!/^(?:please\s+)?(?:click\s+)?apply\s+now\b.*\b(?:view|learn|description|application)\b/i.test(s)&&!/^(?:the\s+)?(?:full\s+|detailed\s+)?job description\b.*\b(?:unavailable|not available|available soon|coming soon)\b/i.test(s)).join(' ').replace(/\b(?:job description|apply now|sample|placeholder|read more|coming soon)\b/gi,'').replace(/[^\p{L}\p{N}]/gu,'')
  if(substantive.length<40)throw Error('Ciena full native description is missing, inactive or instructional only')
 }
 return jobs
}
