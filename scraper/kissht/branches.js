import {activeDocument,requireProof} from './parser.js'
import {nativeCountryName,nativeLocationCountryName} from '../../scraper-support/shared/nativeJobPosting.js'
import {activeHead} from '../../scraper-support/utils/activeNativeHtml.js'
export const FINANCING_PARTNERS_URL='https://www.kissht.com/financing-partners'
export const BRANCHES_URL='https://sicrevacapital.com/our-branches/'
export const BRANCH_LEGAL_EMPLOYER='Si Creva Capital Services Private Limited'
const key=value=>String(value??'').normalize('NFC').replace(/\s+/g,' ').trim().toLowerCase()
const states=new Set(['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Chandigarh','Delhi','Jammu and Kashmir','Ladakh','Puducherry'])
// Inspect raw descendants too: hidden address metadata can contradict the
// visible postal prefix. Newly introduced carriers require explicit review.
const reviewAddressMetadata=node=>{
 const attrs=node.attrs||{}
 const metadata=Object.entries(attrs).some(([name,value])=>
  /^(?:itemprop|itemtype|property|name)$/.test(name)&&/(?:country|address|postal|location|region)/i.test(value)||
  /^data-.*(?:country|address|postal|location|region)/i.test(name)||
  /^(?:class|id)$/.test(name)&&/(?:country|addresscountry|postaladdress)/i.test(value))
 const rawText=(node.children||[]).filter(n=>typeof n==='string').join(' ')
 requireProof(!metadata&&node.tag!=='script'&&!/^\s*Country\s*[:\-]/i.test(rawText),'unreviewed branch address metadata')
 for(const child of node.children||[])if(typeof child!=='string')reviewAddressMetadata(child)
}
export const readEmployerBranches=(partnerHtml,html)=>{
 const partners=activeDocument(partnerHtml)
 requireProof(activeHead(partnerHtml).titles.join()==='Our Financing Partners | Trusted Lending Partners | Kissht','financing partner page identity changed')
 requireProof(partners.nodes(n=>n.tag==='a'&&n.attrs.href==='https://sicrevacapital.com/').length>0,'active exact legal-employer website handoff changed')
 const d=activeDocument(html)
 requireProof(d.nodes(n=>n.tag==='h1'&&d.text(n)==='Locate the nearest loan branches').length===1,'legal-employer branch directory identity changed')
 const cards=d.nodes(n=>n.tag==='div'&&d.hasClass(n,'border')&&d.hasClass(n,'rounded-lg')&&d.hasClass(n,'shadow-sm'))
 requireProof(cards.length>0&&cards.length<=1000,'bounded branch directory unavailable')
 const branches=new Map()
 for(const card of cards){
  reviewAddressMetadata(card)
  const one=predicate=>{const nodes=d.nodes(predicate,card);requireProof(nodes.length===1,'ambiguous branch address field');return d.text(nodes[0])}
  const branch=one(n=>n.tag==='h3'),employer=one(n=>n.tag==='h5')
  requireProof(employer===BRANCH_LEGAL_EMPLOYER,'branch legal employer changed')
  const styled=['city','state','pin','add1'].map(cls=>d.nodes(n=>d.hasClass(n,cls),card).length)
  requireProof(styled.every(n=>n===1)||styled.every(n=>n===0),'mixed branch address contracts')
  const field=(cls,label)=>styled.every(n=>n===0)?one(n=>n.tag==='p'&&new RegExp('^'+label+'\\s*-').test(d.text(n))):one(n=>d.hasClass(n,cls))
  const city=field('city','City').match(/^City\s*-\s*(.+)$/)?.[1],rawState=field('state','State').match(/^State\s*-\s*(.+)$/)?.[1]
  const pin=field('pin','Pin code').match(/^Pin code\s*-\s*([A-Z]{2})\s*-\s*([A-Za-z0-9 -]+)$/)
  requireProof(city&&rawState&&pin,'explicit postal-country branch address missing')
  const country=nativeCountryName(pin[1]);requireProof(country,'unreviewed branch country code')
  for(const value of [city,rawState,branch]){const explicit=nativeLocationCountryName(value);requireProof(!explicit||explicit===country,'contradictory branch country evidence')}
  requireProof(country==='India'||!states.has(rawState),'branch country/state contradiction')
  requireProof(country!=='India'||/^\d{6}$/.test(pin[2]),'invalid India postal address')
  const state=country==='India'&&states.has(rawState)?rawState:null
  const address=field('add1','Address'),entry={branch,legalEmployer:employer,city,state,rawState,country,countryCode:pin[1],postalCode:pin[2],address,sourceUrl:BRANCHES_URL}
  const previous=branches.get(key(branch))
  if(!previous)branches.set(key(branch),entry)
  else if(previous.ambiguous||previous.country!==country||previous.postalCode!==entry.postalCode||key(previous.address)!==key(address)||previous.state&&state&&previous.state!==state)branches.set(key(branch),{ambiguous:true,branch})
  else branches.set(key(branch),{...previous,city:key(previous.city)===key(city)?previous.city:branch,state:previous.state||state,rawState:[previous.rawState,rawState].flat()})
 }
 return branches
}
export const resolveWorkBranch=(row,branches)=>{const branch=row.Business_Name===BRANCH_LEGAL_EMPLOYER?branches.get(key(row.CustomName1)):null;return branch&&!branch.ambiguous?branch:null}
