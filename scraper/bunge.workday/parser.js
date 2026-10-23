import {document,norm} from '../../scraper-support/shared/rmkNativePairHtml.js'
import {requireNative,oneNative,nativeCountryName,nativeDate} from '../../scraper-support/shared/nativeJobPosting.js'
import {parseRmkListing,parseRmkDetail,verifyRmkCompanyToken,readRmkLocationCountry} from '../../scraper-support/shared/successFactorsRmk.js'
export const SOURCE='bunge',COMPANY='Bunge',ORIGIN='https://jobs.bunge.com',HOME=ORIGIN+'/',SEARCH=ORIGIN+'/search/'
export const NATIVE_CONFIG={source:SOURCE,companyName:COMPANY,origin:ORIGIN,companyToken:'Bunge'}
const ensure=(v,m)=>requireNative(v,'Bunge: '+m),key=v=>norm(v).toLowerCase(),rolePath=/^\/job\/[^/]+\/([1-9]\d{5,15})\/$/
const property=(d,scope,name)=>d.nodes(n=>n.attrs.itemprop===name,scope)
const values=(d,scope,name)=>property(d,scope,name).map(n=>n.attrs.content??d.text(n))
const optional=(list,label)=>{ensure(list.length<=1,'Conflicting '+label);return list[0]??null}
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export function readRmkDate(raw,{required=false}={}){
 if(raw==null||raw===''){ensure(!required,'Missing native publication date');return null}
 if(/^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(raw))return nativeDate(raw,{required}).iso
 ensure(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{2} \d{2}:\d{2}:\d{2} UTC \d{4}$/.test(raw),'Unsupported native UTC date')
 const d=new Date(raw),pad=v=>String(v).padStart(2,'0');ensure(Number.isFinite(+d),'Invalid native UTC date')
 ensure(raw===`${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC ${d.getUTCFullYear()}`,'Impossible native calendar/weekday/time')
 return d.toISOString()
}
export function validateURL(value){
 const u=new URL(value);ensure(u.href===value&&u.origin===ORIGIN&&!u.username&&!u.password&&!u.hash,'Unqualified public origin or credentials')
 if(value===HOME||value===SEARCH)return u
 if(['/search','/search/'].includes(u.pathname)){
  const offset=u.searchParams.get('startrow');ensure(/^[1-9]\d*$/.test(offset||'')&&Number(offset)<=10000&&Number(offset)%100===0&&value===ORIGIN+u.pathname+'?q=&sortColumn=referencedate&sortDirection=desc&startrow='+Number(offset),'Unqualified native continuation/scope')
 }else ensure(rolePath.test(u.pathname)&&!u.search,'Unqualified public role/application read')
 return u
}
function headerFields(d,description){
 const result={}
 for(const n of d.nodes(n=>n.tag==='td'||n.tag==='p',description)){
  const m=/^(City|State|Country|Requisition Number|Location)\s*:\s*(.{1,160})$/i.exec(d.text(n));if(!m||/\b(?:City|State|Country|Requisition Number)\s*:/i.test(m[2]))continue
  const name=m[1].toLowerCase().replace(/\s+/g,' '),value=m[2].trim();ensure(!Object.hasOwn(result,name)||result[name]===value,'Conflicting native visible '+name);result[name]=value
 }
 return result
}
export function createSourceConfig({now=()=>new Date().toISOString()}={}){
 const current=Date.parse(now());ensure(Number.isFinite(current),'Invalid observation clock')
 return{source:SOURCE,companyName:COMPANY,boardURL:SEARCH,validateURL,
  sameReadIdentity(from,to){if(from===to)return true;const a=validateURL(from),b=validateURL(to);return ['/search','/search/'].includes(a.pathname)&&['/search','/search/'].includes(b.pathname)&&a.search===b.search},
  handoffs:[{url:HOME,verify(html){const d=document(html);verifyRmkCompanyToken(html,NATIVE_CONFIG);ensure(d.text(oneNative(d.nodes(n=>n.tag==='h1'),'native Bunge heading'))==='Jobs at Bunge','Native brand mismatch');ensure(d.nodes(n=>n.tag==='a'&&n.attrs.href==='https://www.bunge.com/'&&d.text(n)==='Bunge.com').length>0,'Owned portal corporate backlink missing');ensure(d.nodes(n=>n.tag==='a'&&n.attrs.href==='/search/').some(n=>d.text(n)==='Search Open Positions'),'Native public search handoff missing')}}],
  parseListing(html,url){
   const u=validateURL(url),p=parseRmkListing(html,NATIVE_CONFIG),offset=Number(u.searchParams.get('startrow')||0)
   ensure(p.start===offset+1&&p.end===Math.min(offset+100,p.total),'Native100-row pagination range changed');if(p.nextUrl)validateURL(p.nextUrl)
   return{pageNumber:offset/100+1,lastPage:Math.ceil(p.total/100),reportedTotal:p.total,observedRows:p.jobs.length,records:p.jobs.map(r=>({...r,id:r.jobId,url:r.sourceUrl})),nextURL:p.nextUrl,terminationKnown:p.nextUrl===null}
  },
  pageFingerprint:p=>JSON.stringify({total:p.reportedTotal,records:p.records}),candidateForIndia:r=>r.countryCode==='IN'||r.expectedLocationCount>r.locations.length,
  parseDetail(html,row){
   const d=document(html);verifyRmkCompanyToken(html,NATIVE_CONFIG)
   if(/\b(?:this (?:job|position|requisition) is no longer (?:available|active)|(?:this )?position (?:has been|is) filled)\b/i.test(d.text(d.root)))return{excluded:true,reason:'native-visible-role-closed',publicID:row.id}
   const scope=oneNative(d.nodes(n=>Object.hasOwn(n.attrs,'itemscope')&&/^https?:\/\/schema\.org\/JobPosting\/?$/.test(n.attrs.itemtype||'')),'native Bunge JobPosting')
   const employer=oneNative(values(d,scope,'hiringOrganization'),'native employer');ensure(employer===COMPANY,'Native employer mismatch')
   const description=oneNative(property(d,scope,'description'),'native complete description'),plain=d.text(description),fields=headerFields(d,description)
   const mapped=parseRmkDetail(html,row,NATIVE_CONFIG)
   const addresses=property(d,scope,'address').map(n=>{
    ensure(Object.hasOwn(n.attrs,'itemscope')&&n.attrs.itemtype==='http://schema.org/PostalAddress','Unreviewed native address type')
    const raw=Object.fromEntries(['addressLocality','addressRegion','addressCountry','postalCode','streetAddress'].map(k=>[k,optional(values(d,n,k),'native address '+k)]))
    // Read the explicit typed ISO first; the narrow country-only fallback also
    // requires the visible IN label and the independently written India header.
    const hasVisibleStreet=raw.streetAddress&&mapped.nativeLocations.includes(raw.streetAddress)
    const fallback=hasVisibleStreet?readRmkLocationCountry(raw.streetAddress):null
    if(raw.streetAddress==='IN'&&!raw.addressCountry)ensure(fields.country==='India (IN)','Country-only native address lacks written India corroboration')
    const countryCode=raw.addressCountry||fallback;ensure(/^[A-Z]{2}$/.test(countryCode||'')&&nativeCountryName(countryCode),'Explicit native country missing')
    return{...raw,nativeCountryCode:countryCode,country:nativeCountryName(countryCode)}
   })
   ensure(addresses.length===row.expectedLocationCount,'Native address count changed')
   const india=addresses.filter(a=>a.nativeCountryCode==='IN')
   if(!india.length)return{excluded:true,reason:'native-typed-addresses-all-outside-India',publicID:row.id,nativeAddresses:addresses,nativeVisibleLocations:mapped.nativeLocations}
   ensure(plain.length>=180&&/responsibilit|accountabilit|duties|qualification|education|role purpose|key requirements|experience|skills/i.test(plain),'Missing complete native role description')
   const placement=plain.match(/\b(?:this role|this position)\s+(?:is|will be)\s+(?:based|located)\s+in\s+(United States|United Kingdom|Canada|Australia|India)\b/i)
   if(placement&&placement[1]!=='India')return{excluded:true,reason:'explicit-role-placement-outside-India',publicID:row.id,placementEvidence:placement[0]}
   if(fields.country&&row.countryCode==='IN')ensure(fields.country==='India (IN)','Native visible/typed country conflict')
   const state=fields.state?.match(/^(.+) \(([A-Z]{2})-([A-Z0-9]{1,3})\)$/)
   if(state&&row.countryCode==='IN')ensure(state[2]==='IN','Native visible state country conflicts with India')
   const regionConflict=Boolean(state&&row.countryCode==='IN'&&india.some(a=>a.addressRegion)&&!india.some(a=>a.addressRegion===state[3]))
   const labels=india.map(a=>{
    if(regionConflict)return{city:null,state:null,label:'India',nativeATSLocality:a.addressLocality,nativeHeaderCity:fields.city??null,aliasEquivalenceKnown:false,regionEvidenceConflict:true}
    const visibleCity=row.countryCode==='IN'&&fields.city?fields.city:null
    const typedCity=a.addressLocality&&mapped.nativeLocations.some(l=>key(l.split(',')[0])===key(a.addressLocality))?a.addressLocality:null
    const city=visibleCity||typedCity;ensure(city||!a.addressLocality,'Native India city has no visible corroboration')
    return{city:city||null,state:state?.[1]||a.addressRegion||null,label:[...new Set([city,state?.[1]||a.addressRegion,'India'].filter(Boolean))].join(', '),nativeATSLocality:a.addressLocality,nativeHeaderCity:visibleCity,aliasEquivalenceKnown:!visibleCity||!a.addressLocality||key(visibleCity)===key(a.addressLocality)}
   })
   const rawPosted=oneNative(values(d,scope,'datePosted'),'native publication'),posted=readRmkDate(rawPosted,{required:true});ensure(Date.parse(posted)<=current,'Future native publication')
   const visibleDate=d.text(oneNative(d.nodes(n=>n.attrs.id==='job-date',scope),'visible native publication date')).replace(/^Date:\s*/,'');const day=new Date(posted)
   ensure(visibleDate===months[day.getUTCMonth()]+' '+day.getUTCDate()+', '+day.getUTCFullYear(),'Visible/native publication calendar conflict')
   const rawClosing=optional(values(d,scope,'validThrough'),'native expiry'),closing=readRmkDate(rawClosing);ensure(!closing||closing>=posted,'Native expiry precedes publication')
   const app=new URL(mapped.applyUrl);ensure(app.origin===ORIGIN&&!app.username&&!app.password&&!app.hash&&app.pathname==='/talentcommunity/apply/'+row.id+'/'&&app.search==='?locale=en_US','Native role/application identity mismatch')
   const req=fields['requisition number']??null;ensure(req===null||/^[1-9]\d*$/.test(req),'Malformed native requisition')
   const uniqueLabels=[...new Set(labels.map(l=>l.label))],cities=[...new Set(labels.map(l=>l.city).filter(Boolean))]
   return{...mapped,jobId:row.id,requisitionId:req,city:cities.length===1&&labels.every(l=>l.city)?cities[0]:null,state:labels.length===1?labels[0].state:null,country:'India',location:uniqueLabels.join(' / '),locations:uniqueLabels,postingDate:posted,postedAt:posted,closingDate:closing,sourceClosingDateIsExact:Boolean(rawClosing&&/UTC|T.*Z/.test(rawClosing)),sourceDescription:d.inner(description),jobDescription:d.inner(description),nativeDescriptionHTML:d.inner(description),nativeEmployerLabel:employer,nativeAddresses:addresses,nativeVisibleLocations:mapped.nativeLocations,nativeVisibleHeader:fields,nativeIndiaLocationEvidence:labels,nativeRegionEvidenceConflict:regionConflict,nativeDatePosted:rawPosted,nativeVisibleDatePosted:visibleDate,nativeValidThrough:rawClosing,nativePublicPostingID:row.id,nativePostingIDIsNotRequisitionID:true,sourceRequisitionKnown:req!==null,nativeLocalityAliasEquivalenceKnown:labels.every(l=>l.aliasEquivalenceKnown),nativeListingRecord:row,sourceDetailComplete:true,sourceDetailStatus:'complete',sourceListingComplete:false,sourceScopeComplete:false,lifecycleCleanupAllowed:false,applicationVisited:false,firstEverPublication:null,legalEmployer:null}
  },
  projectJobs(result){const{jobs,listingRecords,retainedResponses,unknownRawFailures,...summary}=result;const compact={...summary,extractedDetailJobs:jobs.length,listingRecordCount:listingRecords.length,unknownRawFailureCount:unknownRawFailures.length,fullBatchEvidenceOnFirstExtractedJob:true,retainedResponses:retainedResponses.map(({url,status,bodyBytes,bodySHA256,requestedAt,completedAt})=>({url,status,bodyBytes,bodySHA256,requestedAt,completedAt}))};return jobs.map((j,index)=>({...j,nativeCollectionEvidence:index===0?result:compact}))},
 }
}
