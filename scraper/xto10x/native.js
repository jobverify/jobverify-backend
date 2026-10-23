import {document} from '../../scraper-support/shared/rmkNativePairHtml.js'
import {requireNative,oneNative,nativeDate,nativeLocationCountryName} from '../../scraper-support/shared/nativeJobPosting.js'

export const HOME_URL='https://www.xto10x.com/', ABOUT_URL='https://www.xto10x.com/about'
export const EMPLOYER_URL='https://www.linkedin.com/company/xto10x-tech'
export const INDIA_URL='https://www.linkedin.com/jobs/search/?f_C=14628973&location=India'
export const WORLDWIDE_URL='https://www.linkedin.com/jobs/search/?f_C=14628973&location=Worldwide'
export const RECRUITING_EMAIL='mailto:hungryforimpact@xto10x.com'
export const NATIVE_POSTS=[{id:1728041,title:'Strategy Consultant',url:'https://www.iimjobs.com/j/strategy-consultant-1728041'},{id:1728042,title:'Engagement Manager',url:'https://www.iimjobs.com/j/engagement-manager-1728042'}]
export const apiURL=id=>'https://gladiator.iimjobs.com/job/detail?jobcode='+id
export function activeDocument(html) {
 const doc=document(html)
 const prune=(node,inherited=false)=>{
  node.inactive ||= inherited || /(?:^|;)\s*content-visibility\s*:\s*hidden\s*(?:!important\s*)?(?:;|$)/i.test((node.attrs?.style||'').replace(/\/\*[\s\S]*?\*\//g,''))
  for(const child of node.children.filter(value=>typeof value!=='string'))prune(child,node.inactive)
 }
 prune(doc.root);return doc
}
export function verifyCorporate(html,{about=false}={}) {
 const doc=activeDocument(html),text=doc.text(doc.root)
 requireNative(text.includes('xto10x Technologies'),'Official xto10x employer identity missing')
 const careers=doc.nodes(n=>n.tag==='a'&&doc.text(n)==='Careers')
 requireNative(careers.length>0&&careers.every(n=>n.attrs.href===RECRUITING_EMAIL),'Active corporate careers destination changed')
 requireNative(!doc.nodes(n=>n.tag==='script'&&n.attrs.type==='application/ld+json').some(n=>/JobPosting/.test(n.raw)),'New corporate JobPosting requires role-level review')
 if(about){
  requireNative(doc.nodes(n=>n.tag==='a'&&doc.text(n)==='Join Us'&&n.attrs.href===RECRUITING_EMAIL).length>0,'Active corporate Join Us invitation missing')
  const next=JSON.parse(oneNative(doc.nodes(n=>n.tag==='script'&&n.attrs.id==='__NEXT_DATA__'),'Next data').raw)
  const body=next.props?.pageProps?.story?.content?.body
  requireNative(Array.isArray(body)&&body.length===5&&body.every(b=>['abouthero','beliefs','founders','team','offices'].includes(b.component)),'Unreviewed corporate body component')
  const team=oneNative(body.filter(b=>b.component==='team'),'corporate team')
  requireNative(team.joinUsLink?.linktype==='email'&&team.joinUsLink.email==='hungryforimpact@xto10x.com'&&team.joinLink?.length===1&&team.joinLink[0].link===RECRUITING_EMAIL,'Native corporate invitation destination changed')
  requireNative(doc.nodes(n=>n.tag==='h2'&&doc.text(n)===team.description).length>0,'Corporate generic invitation heading not active')
 }
 return {careersDestination:RECRUITING_EMAIL,firstParty:true,kind:'generic-email-invitation',specificJob:false}
}
export function verifyNativeEmployerPost(html,record,{now=()=>new Date().toISOString()}={}) {
 const envelope=JSON.parse(html),row=envelope.data
 requireNative(row?.id===record.id&&row.title?.trim()===record.title&&row.jobDetailUrl===record.url,'Native employer-posted job identity changed')
 requireNative(row.creatorDomainName==='xto10x.com'&&row.createdBy===340446&&row.companyData?.companyName==='xto10x'&&row.careerCompanyName==='xto10x'&&row.crawled===0,'Exact employer-authored primary posting proof changed')
 requireNative(row.status===1&&row.active===1&&row.applyStatus===1&&row.hasExpired===false&&row.permanentlyRemoved===false&&row.applyUrl==='','Native active application or expiry contract changed')
 const dates=['createdTime','createdTimeMs'].map(field=>{requireNative(Number.isSafeInteger(row[field])&&row[field]>0,'Native creation date invalid');return {field,value:row[field],parsed:nativeDate(new Date(row[field]).toISOString(),{required:true})}})
 const earliest=dates.reduce((a,b)=>a.value<b.value?a:b)
 requireNative(earliest.parsed.iso<=now(),'Native creation date is in the future')
 requireNative(row.createdTimeNoMillis===null&&row.jobStatusInfo===null,'Unreviewed native date/status metadata')
 requireNative(Array.isArray(row.locations)&&row.locations.length>0&&row.locations.every(l=>Object.keys(l).every(k=>['id','name'].includes(k))&&Number.isSafeInteger(l.id)&&typeof l.name==='string'),'Unreviewed native location shape')
 requireNative(JSON.stringify(row.locations)===JSON.stringify(row.location)&&row.address===null&&row.latitude===null&&row.longitude===null,'Unreviewed native country/address contract')
 const explicitCountries=row.locations.map(l=>nativeLocationCountryName(l.name)).filter(Boolean)
 requireNative(explicitCountries.length===0,'Native post now supplies country; renewed eligibility review required')
 return {id:String(row.id),title:row.title.trim(),sourceURL:record.url,apiURL:apiURL(row.id),firstParty:false,employerAuthored:true,creatorDomainName:row.creatorDomainName,nativeEmployerName:row.companyData.companyName,nativeRecord:row,nativeDates:dates,nativeEarliestDate:earliest,explicitCountries,excluded:true,exclusionReason:'no-explicit-native-job-country',activeApplicationFlags:{status:row.status,active:row.active,applyStatus:row.applyStatus,hasExpired:row.hasExpired},sourceScopeComplete:false,lifecycleCleanupAllowed:false}
}
export async function collectNative({read,now}) {
 const about=verifyCorporate(await read(ABOUT_URL),{about:true})
 const home=verifyCorporate(await read(HOME_URL))
 const employer=activeDocument(await read(EMPLOYER_URL))
 requireNative(employer.nodes(n=>n.tag==='h1'&&employer.text(n)==='xto10x').length===1&&employer.nodes(n=>n.attrs['data-semaphore-content-urn']==='urn:li:organization:14628973').length===1,'Native exact employer identity changed')
 requireNative(employer.nodes(n=>n.tag==='a'&&n.attrs['data-tracking-control-name']==='about_website').some(n=>{
  try{const link=new URL(n.attrs.href),target=new URL(link.searchParams.get('url'));return link.origin==='https://www.linkedin.com'&&link.pathname==='/redir/redirect'&&target.href===HOME_URL}catch{return false}
 }),'Native exact employer corporate website changed')
 for(const [url,scope] of [[INDIA_URL,'India'],[WORLDWIDE_URL,'Worldwide']]){
  const listing=activeDocument(await read(url))
  requireNative(listing.nodes(n=>n.tag==='input'&&n.attrs.name==='f_C'&&n.attrs.value==='14628973'&&Object.hasOwn(n.attrs,'checked')).length===1,'Native exact employer search facet changed')
  requireNative(listing.nodes(n=>n.tag==='h1'&&listing.text(n)==='We couldn’t find a match for Jobs jobs in '+scope).length===1&&listing.nodes(n=>listing.hasClass(n,'job-search-card')).length===0,'Native scoped search inventory changed; role-level enumeration required')
 }
 const exclusions=[]
 for(const record of NATIVE_POSTS)exclusions.push(verifyNativeEmployerPost(await read(apiURL(record.id)),record,{now}))
 return {jobs:[],firstParty:false,nativeRecordCount:exclusions.length,exclusions,observations:{home,about,nativeEmployer:{url:EMPLOYER_URL,organizationID:'14628973',employerName:'xto10x',reciprocalCorporateWebsite:HOME_URL,corporateOutgoingHandoffProven:false},scopedSearches:[{url:INDIA_URL,observedCards:0},{url:WORLDWIDE_URL,observedCards:0}]},reason:'Recovered two active employer-authored native iimjobs records (creatorDomainName xto10x.com; crawled0), excluded because location labels provide cities only and no explicit job country. Earliest native creation2026-08-28 retained; no date refresh. Corporate Careers and Join Us are generic email invitations. Exact-employer LinkedIn searches have no matches. No corporate outgoing recruiting handoff proven; firstParty false. Whole-company inventory unknown; cleanup disabled.'}
}
