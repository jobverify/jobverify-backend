import { document, norm } from '../../scraper-support/shared/rmkNativePairHtml.js'
import { nativeCountryName, nativeLocationCountryName, nativeDate } from '../../scraper-support/shared/nativeJobPosting.js'
import { extractActiveDescription } from '../../scraper-support/utils/activeNativeHtml.js'

export const requireProof = (ok, reason) => { if (!ok) throw Error('Kissht native inventory: '+reason) }
const indiaStates = new Set(['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'])
export const activeDocument = html => {
  const doc = document(html)
  const prune = (node, hidden = false) => {
    node.inactive ||= hidden || /(?:^|;)\s*content-visibility\s*:\s*hidden\s*(?:!important\s*)?(?:;|$)/i.test(node.attrs?.style || '')
    node.children.filter(n=>typeof n!=='string').forEach(n=>prune(n,node.inactive))
  }
  prune(doc.root)
  return doc
}
export const roleUrl = row => `https://app1596.workline.hr/CandidatePortal/${row.TrackToken}/${encodeURIComponent(row.SearchKeyWord)}`
export const publicationDate = value => {
  if (value == null || value === '') return null
  const match = /^(\d{2})-([A-Z][a-z]{2})-(\d{4})$/.exec(value)
  requireProof(match,'invalid PublishDate')
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[2])+1
  requireProof(month>0,'invalid publication month')
  return nativeDate(`${match[3]}-${String(month).padStart(2,'0')}-${match[1]}`).raw
}
export const readListings = payload => {
  requireProof(payload?.d && typeof payload.d.obj1==='string' && typeof payload.d.obj2==='string','invalid ASP.NET listing envelope')
  const rows=JSON.parse(payload.d.obj1),facets=JSON.parse(payload.d.obj2)
  requireProof(Array.isArray(rows) && Array.isArray(facets) && facets.some(f=>f.OrgLabel==='Business Unit' && f.AsFieldName==='Company_Name'),'unverified brand facet')
  requireProof(facets.some(f=>f.OrgLabel==='Compliance Location'&&f.AsFieldName==='LOCATIONNAME'),'native compliance-location contract changed')
  const ids=new Set(),tokens=new Set()
  for(const row of rows){
    requireProof(Number.isSafeInteger(row.ERFCode)&&row.ERFCode>0&&row.ERF_Code===row.ERFCode&&!ids.has(row.ERFCode),'invalid or duplicate requisition')
    requireProof(typeof row.TrackToken==='string'&&/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(row.TrackToken)&&!tokens.has(row.TrackToken),'invalid or duplicate public token')
    ids.add(row.ERFCode);tokens.add(row.TrackToken)
    requireProof(row.Company_Name==='Kissht'&&row.Company_Name1==='Kissht','employer mismatch')
    requireProof(row.Business_Code===1 && row.Business_Name==='Si Creva Capital Services Private Limited' || row.Business_Code===2 && row.Business_Name==='OnEMI Technology Solutions Limited','unreviewed legal employer')
    requireProof(typeof row.Position_Name==='string'&&norm(row.Position_Name)&&typeof row.SearchKeyWord==='string'&&row.SearchKeyWord.endsWith('-'+row.ERFCode)&&!/[\/\\?#]/.test(row.SearchKeyWord),'invalid title or public role path')
    requireProof(row.Link==='Apply'&&row.State===row.State_Name,'inactive listing or contradictory states')
    for(const [key,value] of Object.entries(row)) if(value!=null&&/country|state|city|location/i.test(key))
      requireProof(['LOCATIONNAME','City_Name','State_Name','Country_Name','LOCATIONNAME1','State'].includes(key),'unreviewed primary/secondary geographic field')
    requireProof(typeof row.Country_Name==='string'&&typeof row.State_Name==='string','invalid country/state')
    const country=nativeCountryName(row.Country_Name)
    requireProof(!country || !nativeCountryName(row.State_Name)||nativeCountryName(row.State_Name)===country,'country/state contradiction')
    requireProof(!country || !row.State_Name || (country==='India' ? indiaStates.has(row.State_Name) : !indiaStates.has(row.State_Name)),'country/state region contradiction')
    for(const value of [row.LOCATIONNAME,row.LOCATIONNAME1,row.City_Name,row.CustomName1]){
      const explicit=nativeLocationCountryName(value)
      requireProof(!explicit || !country || explicit===country,'contradictory primary/secondary location country')
    }
    publicationDate(row.PublishDate)
  }
  return {rows,facets}
}
export const readDetail = (html,row) => {
  const doc=activeDocument(html),titles=doc.nodes(n=>n.tag==='h6').map(n=>doc.text(n))
  const title=norm(row.Position_Name)+(row.ExternalJobName?' - '+norm(row.ExternalJobName):'')
  requireProof(titles.length===1&&titles[0]===title,'detail title mismatch')
  const labels=doc.nodes(n=>n.tag==='label'&&doc.hasClass(n,'part-time')).map(n=>doc.text(n))
  requireProof(labels.length===1&&labels[0]===row.Req_No,'detail requisition mismatch')
  const meta=doc.nodes(n=>n.tag==='div'&&doc.hasClass(n,'jobs-meta'))
  requireProof(meta.length===1&&doc.text(meta[0]).includes('Kissht'),'detail brand mismatch')
  const summary=doc.nodes(n=>n.tag==='li',meta[0]).map(n=>doc.text(n))
  requireProof(summary.length===4&&summary[0]===row.Req_No&&summary[1]==='Kissht'
    &&summary[2]===norm(row.LOCATIONNAME)&&summary[3]===norm(row.PublishDate),'detail location/publication summary mismatch')
  const application=doc.nodes(n=>n.tag==='input'&&n.attrs.value==='Apply for this job')
    .map(n=>/^parent\.location\.href='([^']+)'$/.exec(n.attrs.onclick||'')?.[1]).filter(Boolean)
    .map(value=>new URL(value,roleUrl(row)).href)
  requireProof(application.length>0&&application.every(url=>url===`https://app1596.workline.hr/Candidate/SignInv1.aspx?PRFCode=${row.TrackToken}&Flag=C&DirectApply=1`),'detail application mismatch')
  const sections=doc.nodes(n=>n.tag==='div'&&doc.hasClass(n,'description-info'))
  requireProof(sections.length<=1,'ambiguous description')
  let description=null
  if(sections.length){
    const parts=doc.nodes(n=>n.tag==='p',sections[0]).map(n=>doc.inner(n))
    const raw=parts.join('\n'),text=extractActiveDescription(doc.text(sections[0]).replace(/^Job Description\s*/i,''))
    const prose=extractActiveDescription(raw.replace(/<(h[1-6]|strong|b)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,''))
    if(text&&norm(text)!==title&&prose&&!/^(?:responsibilities|requirements|qualifications)[\s:!.]*$/i.test(prose)&&extractActiveDescription(raw))description=raw
  }
  return {description,applyUrl:application[0]}
}
