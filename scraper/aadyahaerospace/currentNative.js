import {collectContext,asset,javascript,visit,strings,sha,fail} from './publicSource.js'
const ORIGIN='https://www.aadyah.com',ENTRY=ORIGIN+'/careers',CMS='https://staging.supercode.in/aadyah-cms/wp-json'
const CONFIG={source:'aadyahaerospace',company:'Aadyah Aerospace Pvt.Ltd.',entry:ENTRY}
function cmsRoot(client){
 const candidates=[]
 visit(javascript(client),node=>{
  if(node.type!=='CallExpression'||node.callee?.property?.name!=='get'||!node.arguments[0])return
  const values=strings(node.arguments[0]),root=values.find(value=>/^https:\/\/.+\/wp-json$/.test(value))
  if(root&&values.includes('/acf/v3/options/'))candidates.push(root)
 })
 if(candidates.length!==1||candidates[0]!==CMS)throw fail('AADYAH current public CMS binding changed')
 return candidates[0]
}
function employer(data){
 const terms=data.footer?.find(row=>row.acf_fc_layout==='terms_and_policy')?.copy_right_text1
 const logo=data.logos?.[0]?.dark_logo?.url
 return /AADYAH AEROSPACE/i.test(terms||'')&&typeof logo==='string'&&logo.startsWith(CMS.replace('/wp-json','')+'/wp-content/')
  &&data.nav_links?.some(row=>row.nav_link?.url==='/careers')
}
function nativeModel(header,footer,careers){
 if(!employer(header)||!employer(footer))throw fail('AADYAH native CMS employer identity changed')
 if(!careers||typeof careers!=='object'||Array.isArray(careers)||!Object.hasOwn(careers,'acf')||!careers.acf||typeof careers.acf!=='object')throw fail('AADYAH native careers envelope changed')
 const opening=footer.footer.find(row=>row.acf_fc_layout==='logo_section')?.button
 if(!opening||opening.url!=='/careers#jobs'||!/view opening/i.test(opening.title||''))throw fail('AADYAH current public hiring entry changed')
 return{careersModel:careers,careersContentMissing:Object.keys(careers.acf).length===0,opening:{title:opening.title,url:new URL(opening.url,ORIGIN).href}}
}
export const createCurrentScraper=()=>({run:options=>collectContext(CONFIG,options||{},async scope=>{
 const snapshot=async phase=>{
  const html=await scope.read(ENTRY,'html',phase)
  if(!/AADYAH Aerospace\s*\|\s*Careers/i.test(html))throw fail('AADYAH official careers identity changed')
  const layoutUrl=asset(html,ENTRY,/^\/_next\/static\/chunks\/app\/layout-[\w-]+\.js$/),pageUrl=asset(html,ENTRY,/^\/_next\/static\/chunks\/app\/careers\/page-[\w-]+\.js$/)
  const layout=await scope.read(layoutUrl,'javascript',phase),page=await scope.read(pageUrl,'javascript',phase),root=cmsRoot(layout)
  const pageAst=javascript(page),propertyNames=[]
  visit(pageAst,node=>{if(node.type==='Property')propertyNames.push(node.key?.name||node.key?.value)})
  if(!propertyNames.includes('Opportunities')||!propertyNames.includes('Button_Link'))throw fail('AADYAH current public careers renderer changed')
  const json=async key=>{const body=await scope.read(root+'/acf/v3/options/'+key,'json',phase);try{return JSON.parse(body)}catch(error){if(error instanceof SyntaxError)throw fail('AADYAH native public CMS JSON changed');throw error}}
  const header=await json('header'),footer=await json('footer'),careers=await json('careers')
  return{model:nativeModel(header,footer,careers),clientHashes:[sha(layout),sha(page)],rawNative:{header,footer,careers}}
 }
 const first=await snapshot('initial'),last=await snapshot('closing'),possible=[]
 if(!first.model.careersContentMissing||!last.model.careersContentMissing)possible.push({kind:'unreviewed-native-careers-content',url:CMS+'/acf/v3/options/careers'})
 return scope.finish({observations:[{kind:'public-hiring-entry-with-missing-careers-content',url:ENTRY,vacancy:false,country:null,postingDate:null,descriptionComplete:false,
  applicationUrl:first.model.opening.url,title:first.model.opening.title}],nativeContext:{...first.model,nativeResponses:first.rawNative,clientHashes:first.clientHashes},
  closingMatches:JSON.stringify([first.model,first.clientHashes])===JSON.stringify([last.model,last.clientHashes]),possible,reason:'public-careers-CMS-content-missing-vacancy-inventory-unresolved'})
})})
