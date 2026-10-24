import {document} from '../../scraper-support/shared/rmkNativePairHtml.js'
import {collectParkPlusIndiaNative,CAREERS_URL} from '../parkplusindia/native.js'
export const ALIAS_URL='https://parkplus.io/car-news/parkplus-smart-parking-solution-for-corporate?amp=1'
export const CONTACT_URL='https://parkplus.io/contact-us'
const check=(ok,message)=>{if(!ok)throw new Error(message)}
const activeDocument=html=>{
 const doc=document(html)
 const prune=(node,inherited=false)=>{
  node.inactive ||= inherited || /(?:^|;)\s*content-visibility\s*:\s*hidden\s*(?:!important\s*)?(?:;|$)/i.test((node.attrs?.style||'').replace(/\/\*[\s\S]*?\*\//g,''))
  for(const child of node.children.filter(v=>typeof v!=='string'))prune(child,node.inactive)
 }
 prune(doc.root);return doc
}
// This is a reviewed, first-party alias, never a fuzzy catalogue-name match.
export const collectParkPlusCompanyNative=async({read,now})=>{
 const careers=await read(CAREERS_URL)
 const alias=activeDocument(await read(ALIAS_URL)),contact=activeDocument(await read(CONTACT_URL))
 const article=alias.text(alias.root),legal=contact.text(contact.root)
 check(article.includes('Park+ Smart Parking Solution for Corporate')&&article.includes('Park Plus, a provider of smart parking solutions, has announced')&&article.includes('About Park Plus'),'First-party Park Plus/Park+ alias proof changed or inactive')
 check(contact.nodes(n=>n.tag==='h1'&&contact.text(n)==='Park+ Contact US').length===1&&legal.includes('Parviom Technologies pvt ltd Also known as Park+')&&legal.includes('Parviom Technologies (Park+)'),'First-party legal employer/brand proof changed or inactive')
 const result=await collectParkPlusIndiaNative({read:url=>url===CAREERS_URL?Promise.resolve(careers):read(url),now})
 return {...result,jobs:result.jobs.map(job=>({...job,source:'parkpluscompany'})),
  facts:{...result.facts,verifiedAlias:'Park Plus',officialBrandName:'Park+',legalEmployerName:'Parviom Technologies pvt ltd',canonicalCompanyName:'Park+ India',aliasProofUrls:[ALIAS_URL,CONTACT_URL]},
  reason:'First-party Park Plus/Park+ alias and legal employer identity verified. Existing canonical job company retained for stable cross-source fingerprints. '+result.reason}
}
