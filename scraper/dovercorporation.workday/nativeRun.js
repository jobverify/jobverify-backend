import {extractWorkdayStructuredDetail} from '../../scraper-support/myworkday/engine.js'
import {attachInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {BOARD,API,CLIENT,OFFICIAL_BINDING,check,verifyShell,canonicalFacets,discoverOffices,listing,detail,detailSnapshot,description,nativeDate} from './nativeContract.js'

export async function runNative({signal,now}){
 let cookies='',csrf=''
 const clientURL=url=>{try{const u=new URL(url);return u.origin==='https://prod-wd103.myworkdaycdn.com'&&!u.search&&!u.hash&&!u.username&&!u.password&&/^\/wday\/asset\/candidate-experience-jobs\/(?:\d{4}\.\d{1,2}\.\d{1,3}\/)?cx-jobs\.min\.js$/.test(u.pathname)}catch{return false}}
 async function request(url,body,isClient=false){
  signal.throwIfAborted()
  const headers={Accept:body||url.startsWith(API+'/job/')?'application/json':isClient?'application/javascript,*/*;q=0.8':'text/html,application/xhtml+xml','User-Agent':'Mozilla/5.0',...(body?{'Content-Type':'application/json'}:{}),...(!isClient&&cookies?{Cookie:cookies}:{}),...(body&&csrf?{'x-calypso-csrf-token':csrf}:{})}
  const requestSignal=AbortSignal.any([signal,AbortSignal.timeout(15000)])
  const fetchOne=target=>fetch(target,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:requestSignal})
  let response=await fetchOne(url)
  if(isClient&&[301,302,303,307,308].includes(response.status)){
   const target=new URL(response.headers.get('location'),url).href
   check(clientURL(target),'Advertised client redirect URL invalid');response=await fetchOne(target)
  }
  check(response.status===200&&(isClient?clientURL(response.url):response.url===url),'Native HTTP/final URL identity failure')
  if(url===BOARD){const set=response.headers.getSetCookie?.()??[];cookies=set.map(v=>v.split(';')[0]).join('; ');csrf=set.find(v=>v.startsWith('CALYPSO_CSRF_TOKEN='))?.split(';')[0].slice(19)??''}
  const value=await response.text();requestSignal.throwIfAborted();signal.throwIfAborted()
  check(typeof value==='string'&&value.length<10000000,'Native response body bound exceeded')
  return{body:value,requestedURL:url,finalURL:response.url}
 }
 const shell=(await request(BOARD)).body
 verifyShell(shell)
 const client=await request(CLIENT,undefined,true);check(client.body.includes('appliedFacets'),'Native advertised public client contract missing')
 const search=async body=>JSON.parse((await request(API+'/jobs',body)).body)
 const globalBody={appliedFacets:{},limit:20,offset:0,searchText:''}
 const initialGlobal=await search(globalBody),offices=discoverOffices(initialGlobal),snapshots=[],rows=[],reqs=new Set(),paths=new Set()
 for(const office of offices){
  for(let offset=0;offset<Math.max(1,office.count);offset+=20){
   check(offset<2000,'Native page bound exhausted')
   const body={appliedFacets:{locations:[office.id]},limit:20,offset,searchText:''},state=listing(await search(body),office,offset)
   snapshots.push({body,office,offset,state})
   for(const row of state.rows){check(!reqs.has(row.req)&&!paths.has(row.externalPath),'Duplicate native selected listing identity');reqs.add(row.req);paths.add(row.externalPath);rows.push(row)}
  }
 }
 // Preserve transport order for the captured native detail sequence, regardless
 // of harmless listing order changes. IDs, not title similarity, identify roles.
 rows.sort((a,b)=>a.officeId.localeCompare(b.officeId)||a.req.localeCompare(b.req))
 const details=new Map(),uids=new Set()
 for(const row of rows){const payload=JSON.parse((await request(API+row.externalPath)).body),v=detail(payload,row,now());check(!uids.has(v.id),'Duplicate native posting UID');uids.add(v.id);details.set(row.req,payload)}
 const finalGlobal=await search(globalBody);discoverOffices(finalGlobal)
 check(JSON.stringify(canonicalFacets(initialGlobal.facets))===JSON.stringify(canonicalFacets(finalGlobal.facets)),'Native global typed facet drift')
 for(const snapshot of snapshots){const final=listing(await search(snapshot.body),snapshot.office,snapshot.offset);check(JSON.stringify(snapshot.state)===JSON.stringify(final),'Native selected listing/facet/identity drift')}
 const jobs=[]
 for(const row of rows){
  const payload=JSON.parse((await request(API+row.externalPath)).body),v=detail(payload,row,now()),prior=details.get(row.req)
  check(detailSnapshot(prior)===detailSnapshot(payload),'Native authoritative detail drift')
  const active=description(v.jobDescription),mapped=active?extractWorkdayStructuredDetail(payload):null
  check(!active||mapped,'Native description mapping unavailable')
  jobs.push({jobId:v.jobReqId,requisitionId:v.jobReqId,title:v.title,company:'Dover Corporation',source:'dovercorporation',
   location:v.location,city:v.location.split(',')[0],locations:[v.location],country:'India',
   sourceUrl:v.externalUrl,link:v.externalUrl,applyUrl:v.externalUrl,sourceApplicationEvidence:{posted:true,canApply:true,exactAdvertisedRoleURL:v.externalUrl,explicitApplyURL:null,applicationLandingPageFetched:false},
   postedAt:nativeDate(v.startDate,now(),true),closingDate:v.endDate==null?null:nativeDate(v.endDate,now()),sourceClosingDateIsExact:false,scrapedAt:now(),
   jobDescription:active,sourceDescription:active?v.jobDescription:null,sourceDetailComplete:Boolean(active),
   ...(!active?{sourceRejectedNativeDescription:v.jobDescription??null,sourceDetailFailureKind:'unqualified-role-content'}:{}),
   department:mapped?.department,minimumQualification:mapped?.minimumQualification,preferredQualification:mapped?.preferredQualification,requiredSkills:mapped?.requiredSkills,experienceRequired:mapped?.experienceRequired,publicExperienceChecked:Boolean(active),
   nativeEmployer:payload.hiringOrganization.name,nativeBoardProvenance:[{tenant:'dover',site:'Dover',nativePostingUid:v.id,requisitionId:v.jobReqId,canonicalUrl:v.externalUrl,nativeEmployer:payload.hiringOrganization.name}],
   sourceOfficialBinding:OFFICIAL_BINDING,sourceClientIdentity:{requestedURL:client.requestedURL,finalURL:client.finalURL},
   sourceNativeLocationFacets:{parameter:'locations',ids:offices.map(v=>v.id),selectedOfficeId:row.officeId,scope:'four-explicit-native-India-offices-only'},
   sourceListingComplete:false,sourceScopeComplete:false,sourceCompanyCoverageComplete:false,sourceGlobalJobCount:null,sourceIndiaJobCount:null,
   sourceObservedIndiaJobCount:rows.length,sourceBoardInventories:offices.map(office=>({tenant:'dover',site:'Dover',scope:'configured-native-location-subset',appliedFacets:{locations:[office.id]},reportedTotal:office.count,observedIndia:office.count,pagesFetched:Math.max(1,Math.ceil(office.count/20)),stableReportedTotal:true,explicitGlobalEmpty:false})),
   sourceFinalListingEvidence:{allSelectedPagesRechecked:true,allSelectedDetailsRechecked:true,typedFacetSetsRechecked:true,pagesFetched:snapshots.length,companyGlobalTotal:null,companyIndiaTotal:null},
  })
 }
 signal.throwIfAborted()
 return attachInventoryEvidence(jobs,{status:'coverage-gap',surface:BOARD,firstParty:true,listingComplete:false,pagesFetched:snapshots.length,reportedTotal:null,indiaFacetCount:null,verifiedAt:now(),reason:'four-exact-native-India-office-facets-only-company-global-and-India-scope-unproven'})
}
