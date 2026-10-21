import {readNativeDocument,decodeNativeHtml} from './nativeHtml.js'
export const CORPORATE='https://www.colgatepalmolive.co.in/',ORIGIN='https://jobs.colgate.com',SEARCH=ORIGIN+'/search/',API=ORIGIN+'/services/recruiting/v1/jobs'
export const check=(condition,message)=>{if(!condition)throw Error('Colgate public native contract: '+message)}
const norm=s=>String(s??'').replace(/\s+/g,' ').trim()
// Ignore JavaScript comments without damaging quoted URLs or configuration
// strings. Commented-out bootstrap data cannot establish current native identity.
function withoutComments(text){
 let out=''
 for(let i=0;i<text.length;i++){
  const c=text[i]
  // The observed bootstrap uses plain quoted literals only. Template literals
  // (including interpolations) are a changed executable contract; their text
  // must never be mistaken for current declarations or native company fields.
  check(c!=='`','Native bootstrap template expression requires qualification')
  if(c==='"'||c==="'"){const start=i;for(i++;i<text.length;i++){if(text[i]==='\\')i++;else if(text[i]===c)break}check(i<text.length,'Truncated native bootstrap string');out+=text.slice(start,i+1)}
  else if(c==='/'&&text[i+1]==='/'){while(i<text.length&&!/[\r\n]/.test(text[i]))i++;out+='\n'}
  else if(c==='/'&&text[i+1]==='*'){const end=text.indexOf('*/',i+2);check(end>=0,'Truncated native bootstrap comment');out+=' ';i=end+1}
  else out+=c
 }
 return out
}
const activeScripts=d=>d.nodes(n=>n.tag==='script'&&!n.attrs.src&&!Object.hasOwn(n.attrs,'nomodule')&&['','text/javascript','application/javascript','module'].includes(n.attrs.type??'')).map(n=>withoutComments(n.raw??''))
// Recognize only statement starts outside all blocks/expressions. This is a
// conservative reader of the observed bootstrap, never a JavaScript evaluator.
function statementStarts(text){
 const starts=new Set();let curly=0,round=0,square=0,boundary=0
 for(let i=0;i<text.length;i++){
  const c=text[i]
  if(c==='"'||c==="'"){for(i++;i<text.length;i++){if(text[i]==='\\')i++;else if(text[i]===c)break}continue}
  if(curly===0&&round===0&&square===0&&text.slice(boundary,i).trim()===''&&!/\s/.test(c))starts.add(i)
  if(c==='{')curly++;else if(c==='}')curly--;else if(c==='(')round++;else if(c===')')round--;else if(c==='[')square++;else if(c===']')square--
  check(curly>=0&&round>=0&&square>=0,'Unsupported native bootstrap lexical shape')
  if(curly===0&&round===0&&square===0&&(c===';'||c==='}'))boundary=i+1
 }
 return starts
}
const topLevelMatches=(script,regex)=>{const starts=statementStarts(script);return[...script.matchAll(regex)].filter(m=>starts.has(m.index))}
function nativeObject(script,start){let depth=0;for(let i=start;i<script.length;i++){const c=script[i];if(c==='"'||c==="'"){for(i++;i<script.length;i++){if(script[i]==='\\')i++;else if(script[i]===c)break}}else if(c==='{')depth++;else if(c==='}'&&--depth===0)return script.slice(start,i+1)}throw Error('Colgate public native contract: Truncated native object')}
function directProperty(object,wanted){
 const keys=new Set();let i=1,found
 const space=()=>{while(/\s/.test(object[i]??'')&&i<object.length)i++}
 const quoted=()=>{const start=i,q=object[i++];for(;i<object.length;i++){if(object[i]==='\\')i++;else if(object[i]===q){i++;return object.slice(start,i)}}throw Error('Colgate public native contract: Truncated property string')}
 while(i<object.length-1){
  space();if(object[i]===','){i++;continue}if(object[i]==='}')break
  let key
  if(object[i]==='"'||object[i]==="'"){const literal=quoted();check(!literal.includes('\\'),'Escaped native property names unsupported');key=literal.slice(1,-1)}
  else{const m=object.slice(i).match(/^[A-Za-z_$][\w$]*/);check(m,'Native property shape changed');key=m[0];i+=key.length}
  check(!keys.has(key),'Duplicate native object property');keys.add(key);space();check(object[i++]===':','Native property initializer unavailable');space();const start=i;let curly=0,round=0,square=0
  for(;i<object.length;i++){
   const c=object[i];if(c==='"'||c==="'"){quoted();i--;continue}
   if(curly===0&&round===0&&square===0&&(c===','||c==='}'))break
   if(c==='{')curly++;else if(c==='}')curly--;else if(c==='(')round++;else if(c===')')round--;else if(c==='[')square++;else if(c===']')square--
   check(curly>=0&&round>=0&&square>=0,'Native property expression malformed')
  }
  check(i>start,'Native property value missing');if(key===wanted)found=object.slice(start,i).trim()
 }
 return found
}
export function verifyCorporate(body){const d=readNativeDocument(body);check(d.nodes(n=>n.tag==='title').some(n=>/Colgate-Palmolive/.test(n.raw)),'Corporate title missing');const canonical=d.nodes(n=>n.tag==='link'&&n.attrs.rel==='canonical');check(canonical.length===1&&canonical[0].attrs.href===CORPORATE,'Corporate canonical missing or conflicting');check(d.nodes(n=>n.tag==='a'&&n.attrs.href===ORIGIN+'/').length>0,'Active corporate native careers handoff missing')}
export function verifySearch(body){
 const d=readNativeDocument(body),scripts=activeScripts(d)
 const initializers=scripts.flatMap(s=>topLevelMatches(s,/\bj2w\.init\s*\(\s*\{/g).map(m=>nativeObject(s,m.index+m[0].length-1)))
 const styles=scripts.flatMap(s=>topLevelMatches(s,/\bif\s*\(\s*typeof\s+resultStyles\s*===\s*'undefined'\s*\)\s*\{\s*var\s+resultStyles\s*=\s*\{/g).map(m=>nativeObject(s,m.index+m[0].length-1)))
 check(initializers.length===1&&styles.length===1,'Current top-level native initialization unavailable')
 const sso=directProperty(initializers[0],'ssoCompanyId'),company=directProperty(styles[0],'companyId')
 check(/^(['"])colgate\1$/.test(sso??'')&&/^(['"])colgate\1$/.test(company??''),'Native company token must be a matching direct literal property')
 check(scripts.some(s=>topLevelMatches(s,/\bvar\s+unifyBuildVersion\s*=\s*"RMK\/j2w-all-multibranch-CI\/b2605\.31"/g).length===1&&s.includes('xweb/rmk-jobs-search')&&s.includes('https://performancemanager4.successfactors.com/verp/vmod_3')&&s.includes('asset-manifest-entrypoints.json?tag=')),'Current advertised widget version/shape changed')
 check(scripts.some(s=>s.includes('fieldId:"filter1"')&&s.includes('label:"Country"')),'Current native country facet unavailable')
 const srcs=d.nodes(n=>n.tag==='script'&&!Object.hasOwn(n.attrs,'nomodule')).map(n=>n.attrs.src)
 check(srcs.includes('/platform/js/widgets/reactWidgetLoader.js')&&srcs.includes('https://performancemanager4.successfactors.com/verp/vmod_3/ui/widget-loader/resources/widget-loader.js'),'Advertised active widget loaders missing')
 const nonce=scripts.flatMap(s=>topLevelMatches(s,/\bvar\s+CSRFToken\s*=\s*(["'])([^"']+)\1\s*;/g).map(m=>m[2]));check(nonce.length===1&&nonce[0].length>=16&&nonce[0].length<=128,'Public anonymous nonce unavailable');return nonce[0]
}
export function checkEnvelope(d){check(d&&typeof d==='object'&&!Array.isArray(d),'Malformed native response');for(const[k,v]of Object.entries(d)){const key=k.toLowerCase().replace(/[_\s-]/g,'');if(['error','errors','errorcode','errormessage','exception','fault'].includes(key))check(false,'Explicit native error');if(key==='success')check(v===true,'Native failure flag');if(['status','statuscode','httpstatus'].includes(key))check(v===200,'Native error status');if(['meta','metadata','result','response'].includes(key)&&v!=null)checkEnvelope(v)}}
export function nativeDate(value,now,publication=false){check(typeof value==='string'&&/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(value),'Native date shape unavailable');const[m,d,y]=value.split('/').map(Number),date=new Date(Date.UTC(2000+y,m-1,d));check(date.getUTCFullYear()===2000+y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d,'Native invalid calendar');check(!publication||date.getTime()<=Date.parse(now),'Native future publication');return date.toISOString()}
export function validateRow(row,now){
 checkEnvelope(row);check(typeof row.id==='string'&&/^[1-9]\d{3,8}$/.test(row.id),'Native requisition identity malformed');check(typeof row.unifiedStandardTitle==='string'&&row.unifiedStandardTitle.trim()&&!/[<>\u0000-\u001f]/.test(row.unifiedStandardTitle),'Native title malformed')
 check(Array.isArray(row.filter5)&&row.filter5.length===1&&row.filter5[0]==='Colgate-Palmolive','Native company brand mismatch')
 check(Array.isArray(row.supportedLocales)&&row.supportedLocales.includes('en_US'),'Native locale unavailable')
 check(Array.isArray(row.jobLocationShort)&&row.jobLocationShort.length===1&&typeof row.jobLocationShort[0]==='string','Native location scope missing')
 const location=row.jobLocationShort[0].split(',').map(s=>s.trim());check(location.length===4&&location[0]==='Mumbai'&&location[1]==='MH'&&location[2]==='IND'&&location[3]==='','Native location outside verified Mumbai/Maharashtra/India scope')
 check(Array.isArray(row.jobLocationShortWithCoordinates)&&row.jobLocationShortWithCoordinates.length===1&&row.jobLocationShortWithCoordinates[0].value===row.jobLocationShort[0],'Native location fields conflict')
 const slug=row.unifiedUrlTitle;check(typeof slug==='string'&&slug.length>0&&/^(?:[A-Za-z0-9_%.,()-]|&amp;)+$/.test(slug)&&!/%(?:2f|5c|3f|23)/i.test(slug)&&row.urlTitle===slug,'Native URL title mismatch')
 return{...row,sourceURL:ORIGIN+'/job/'+slug+'/'+row.id+'-en_US',postedAt:nativeDate(row.unifiedStandardStart,now,true),closingDate:row.unifiedStandardEnd==null?null:nativeDate(row.unifiedStandardEnd,now)}
}
export function parsePage(d,page,now,expectedTotal){checkEnvelope(d);check(Number.isSafeInteger(d.totalJobs)&&d.totalJobs>=0&&d.totalJobs<=500,'Native total invalid or exceeds bound');check(expectedTotal==null||d.totalJobs===expectedTotal,'Native total drift');check(Array.isArray(d.jobSearchResult)&&d.jobSearchResult.length===Math.min(10,Math.max(0,d.totalJobs-page*10)),'Native page size/range mismatch');return{total:d.totalJobs,rows:d.jobSearchResult.map(j=>{check(j&&typeof j==='object'&&!Array.isArray(j),'Native row envelope malformed');return validateRow(j.response,now)})}}
const serialize=n=>typeof n==='string'?n:n.inert||['script','style'].includes(n.tag)?'':`<${n.tag}>${n.children.map(serialize).join('')}</${n.tag}>`
export function parseDetail(body,row,now){
 const d=readNativeDocument(body),canonicals=d.nodes(n=>n.tag==='link'&&n.attrs.rel==='canonical');check(canonicals.length===1&&canonicals[0].attrs.href===decodeNativeHtml(row.sourceURL)+'/','Native canonical identity mismatch')
 const titles=d.nodes(n=>n.attrs.itemprop==='title');check(titles.length===1&&d.text(titles[0])===row.unifiedStandardTitle,'Native detail title mismatch')
 const sections=d.nodes(n=>n.attrs.itemprop==='description');check(sections.length===3,'Native full description sections unavailable')
 const text=sections.map(n=>d.text(n));check(text[0].includes('Job Number #'+row.id+' - Mumbai, Maharashtra, India')&&text[0].includes('Colgate-Palmolive Company'),'Native detail requisition/country/company context mismatch')
 const main=text[1],meaningful=main.split(/(?<=[.!?])\s+/).filter(s=>!/^(?:please\s+)?(?:(?:click\s+(?:the\s+)?)?apply\s+now|submit\s+(?:your\s+)?application)\b/i.test(s)&&!/^.{0,25}job description\b.*\b(?:unavailable|not available|available soon|coming soon|attached)\b/i.test(s)).join(' ').replace(/\b(?:job description|apply now|sample|placeholder|read more|coming soon)\b/gi,'').replace(/[^\p{L}\p{N}]/gu,'')
 check(!/\b(?:(?:this|the) (?:job|position|role|vacancy) (?:is (?:no longer available|closed)|has been (?:closed|filled))|no longer accepting applications)\b/i.test(text.join(' ')),'Native role explicitly closed');check(meaningful.length>=100,'Native substantive role description missing; company boilerplate cannot replace it')
 const labels=d.nodes(n=>(n.attrs.class||'').split(/\s+/).includes('joblayouttoken')).map(n=>d.text(n)),starts=labels.filter(s=>s.startsWith('Posting Start Date:')).map(s=>norm(s.slice('Posting Start Date:'.length)));check(starts.length===1&&starts[0]===row.unifiedStandardStart,'Native detail publication mismatch')
 const ends=labels.filter(s=>s.startsWith('Posting End Date:')).map(s=>norm(s.slice('Posting End Date:'.length)));check(row.closingDate?ends.length===1&&ends[0]===row.unifiedStandardEnd:ends.length===0,'Native detail closing date mismatch')
 const applyPath='/talentcommunity/apply/'+row.id+'/?locale=en_US',applies=d.nodes(n=>n.tag==='a'&&/^Apply now$/i.test(d.text(n)));check(applies.length>0&&applies.every(n=>n.attrs.href===applyPath),'Native active application identity mismatch')
 const sourceDescription=sections.map(n=>n.children.map(serialize).join('')).join('\n'),jobDescription=text.join('\n\n')
 return{source:'colgatepalmolive',company:'Colgate-Palmolive',jobId:row.id,requisitionId:row.id,title:row.unifiedStandardTitle,sourceUrl:row.sourceURL,link:row.sourceURL,applyUrl:ORIGIN+applyPath,location:'Mumbai, Maharashtra, India',locations:['Mumbai, Maharashtra, India'],city:'Mumbai',state:'Maharashtra',country:'India',postedAt:row.postedAt,closingDate:row.closingDate,sourceClosingDateIsExact:false,sourceDescription,jobDescription,nativeCompanyBrand:row.filter5[0],nativeLegalEmployer:null,nativeRawLocations:row.jobLocationShort,nativePostedDate:row.unifiedStandardStart,nativeClosingDate:row.unifiedStandardEnd??null,sourceDetailComplete:true,sourceListingComplete:false,sourceScopeComplete:false,sourceCompanyCoverageComplete:false,sourceGlobalJobCount:null,sourceIndiaJobCount:null,scrapedAt:now}
}
