import assert from 'node:assert/strict'
import test from 'node:test'

globalThis.fetch=()=>{throw Error('Offline Financial Times network tripwire')}
const load=()=>import('./script.js')
const offices=[
 {id:1,name:'APAC',parent_id:null,child_ids:[2,3]},
 {id:2,name:'India',parent_id:1,child_ids:[3]},
 {id:3,name:'Bangalore',parent_id:2,child_ids:[]},
 {id:4,name:'North America',parent_id:null,child_ids:[5,6]},
 {id:5,name:'United States of America',parent_id:4,child_ids:[6]},
 {id:6,name:'Georgia',parent_id:5,child_ids:[]},
]
const role={id:101,internal_job_id:999,requisition_id:'JR123',title:'Platform Engineer',company_name:'Financial Times',
 absolute_url:'https://job-boards.eu.greenhouse.io/financialtimes33/jobs/101',location:{name:'Bangalore'},offices:[{id:3,name:'Bangalore',parent_id:2,child_ids:[]}],departments:[{id:7,name:'Technology'}],
 first_published:'2026-10-20T09:14:33-04:00',updated_at:'2026-10-27T18:30:00Z',application_deadline:'2026-11-20T12:00:00Z',
 content:'&lt;h2&gt;The role&lt;/h2&gt;&lt;p&gt;Build connectors &amp;amp; retain &amp;lt;literal&amp;gt; examples.&lt;/p&gt;&lt;h3&gt;Requirements&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Production API experience.&lt;/li&gt;&lt;li&gt;Database skills.&lt;/li&gt;&lt;/ul&gt;',metadata:[]}

test('FT country resolves through exact native office ancestry without interpreting a US-state office as Georgia country',async()=>{
 const mod=await load();assert.equal(typeof mod.buildOfficeGraph,'function')
 const graph=mod.buildOfficeGraph({offices})
 const india=mod.classifyFinancialTimesWorksites(role,graph)
 assert.equal(india.country,'India');assert.equal(india.complete,true)
 const us=mod.classifyFinancialTimesWorksites({...role,location:{name:'Georgia'},offices:[offices[5]]},graph)
 assert.equal(us.country,'United States');assert.equal(us.complete,true)
})

test('FT full native criteria decode transport and individual text leaves once and preserve original native identities/dates',async()=>{
 const mod=await load();assert.equal(typeof mod.parseFinancialTimesRole,'function')
 const job=mod.parseFinancialTimesRole(role,mod.buildOfficeGraph({offices}),{now:'2026-10-27T00:00:00Z'})
 assert.equal(job.jobId,'101');assert.equal(job.requisitionId,'JR123');assert.equal(job.internalJobId,999)
 assert.equal(job.postingDate,role.first_published);assert.equal(job.closingDate,role.application_deadline);assert.equal(job.sourceClosingDateIsExact,true)
 assert.equal(job.country,'India');assert.equal(job.sourceDetailComplete,true)
 for(const text of ['connectors & retain <literal> examples.','Production API experience.','Database skills.'])assert.ok(job.sourceDescription.includes(text))
 assert.equal(job.legalEmployer,null);assert.equal(job.employmentType,null);assert.equal(job.workMode,null)
})

test('registered FT execution must stop current employer denial before reading the historical public API',async()=>{
 const {getScraperCatalog,createCatalogScraper}=await import('../../scraper-support/providers/index.js')
 const calls=[]
 await assert.rejects(createCatalogScraper(getScraperCatalog().find(p=>p.source==='financialtimes')).run({
  fetchPage:async url=>{calls.push(url);return{status:403,url,body:'<title>Access denied</title>',contentType:'text/html'}},
  fetchJson:async()=>({meta:{total:1},jobs:[role]}),
 }),/403|denied/)
 assert.deepEqual(calls,['https://aboutus.ft.com/'])
})

test('FT rejects broken office graphs and mismatching native office identities',async()=>{
 const m=await load()
 for(const broken of [[...offices,offices[0]],offices.map(o=>o.id===3?{...o,parent_id:77}:o),offices.map(o=>o.id===2?{...o,parent_id:3}:o)])assert.throws(()=>m.buildOfficeGraph({offices:broken}),/office|cycle/i)
 assert.equal(m.classifyFinancialTimesWorksites({...role,offices:[{...role.offices[0],name:'Mumbai'}]},m.buildOfficeGraph({offices})).complete,false)
 assert.equal(m.classifyFinancialTimesWorksites({...role,location:{name:'Unknown City'}},m.buildOfficeGraph({offices})).complete,false)
})

test('FT broad regions need role-owned location evidence and primary alternatives are all resolved',async()=>{
 const m=await load(),nodes=[...offices,{id:7,name:'Singapore',parent_id:1,child_ids:[]}],g=m.buildOfficeGraph({offices:nodes})
 const apac={...role,location:{name:'APAC'},offices:[nodes.at(-1)]}
 assert.equal(m.classifyFinancialTimesWorksites(apac,g).complete,false)
 const known=m.classifyFinancialTimesWorksites({...apac,content:'&lt;p&gt;This role will be based in Singapore and work closely with colleagues.&lt;/p&gt;'},g)
 assert.equal(known.complete,true);assert.equal(known.country,'Singapore')
 const both=m.classifyFinancialTimesWorksites({...role,location:{name:'Bangalore; Georgia'}},g)
 assert.deepEqual(both.countries,['India','United States']);assert.equal(both.complete,false)
})

test('FT parser excludes hidden and inert criteria and never substitutes update time or invents absent fields',async()=>{
 const m=await load(),j=m.parseFinancialTimesRole({...role,first_published:null,application_deadline:null,requisition_id:null,content:role.content+'&lt;template&gt;NOT A REQUIREMENT&lt;/template&gt;&lt;p hidden&gt;SECRET&lt;/p&gt;&lt;span style="opacity:0"&gt;GHOST&lt;/span&gt;'},m.buildOfficeGraph({offices}))
 assert.equal(j.postingDate,null);assert.equal(j.closingDate,null);assert.equal(j.requisitionId,null)
 for(const v of ['NOT A REQUIREMENT','SECRET','GHOST'])assert.ok(!j.sourceDescription.includes(v))
 const uncertain=m.parseFinancialTimesRole({...role,content:role.content+'&lt;p style="display:var(--show)"&gt;uncertain&lt;/p&gt;'},m.buildOfficeGraph({offices}))
 assert.equal(uncertain.sourceDetailComplete,false)
 for(const drift of [{company_name:'Another company'},{absolute_url:'https://job-boards.eu.greenhouse.io/another/jobs/101'},{absolute_url:'https://job-boards.eu.greenhouse.io/financialtimes33/jobs/102'}])assert.throws(()=>m.parseFinancialTimesRole({...role,...drift},m.buildOfficeGraph({offices})),/employer|identity|board/i)
})

const html='<html><head><title>Careers | Financial Times</title></head><body><a href="/careers/">Careers</a><a href="https://boards.eu.greenhouse.io/financialtimes33/">Vacancies</a></body></html>'
const transport=(changes={})=>{
 const calls=[];let closing=false
 return {calls,options:{now:()=> '2026-10-27T00:00:00Z',fetchPage:async url=>{calls.push(url);return {url,status:200,body:html,contentType:'text/html'}},fetchJson:async url=>{calls.push(url);if(url.endsWith('/offices'))return {offices};const result={meta:{total:2},jobs:[role,{...role,id:102,absolute_url:role.absolute_url.replace('/101','/102')}]};if(closing&&changes.closing)changes.closing(result);closing=true;return result},...changes.options}}
}

test('FT registered adapter reconciles complete native inventory before caps and retains native totals',async()=>{
 const {getScraperCatalog,createCatalogScraper}=await import('../../scraper-support/providers/index.js');const {readInventoryEvidence}=await import('../../scraper-support/utils/inventoryEvidence.js')
 const t=transport();let audit;const jobs=await createCatalogScraper(getScraperCatalog().find(p=>p.source==='financialtimes')).run({...t.options,maxJobs:1,onAudit:a=>{audit=a}})
 assert.equal(jobs.length,1);assert.equal(jobs[0].jobId,'101');assert.equal(audit.nativePostings,2);assert.equal(audit.indiaVacancies,2)
 assert.equal(t.calls.filter(u=>u.includes('/jobs?')).length,2);assert.equal(t.calls.filter(u=>u.endsWith('/offices')).length,2)
 assert.equal(readInventoryEvidence(jobs).status,'discovery-only');assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 const full=await createCatalogScraper(getScraperCatalog().find(p=>p.source==='financialtimes')).run(transport().options)
 assert.equal(readInventoryEvidence(full).status,'complete-inventory');assert.equal(readInventoryEvidence(full).reportedTotal,2)
})

test('FT refuses total truncation, changed closing capture, corporate drift, and aborted requests',async()=>{
 const m=await load()
 const changed=transport({closing:r=>{r.jobs[1].content+='changed'}});const partial=await m.run(changed.options)
 assert.equal(partial.sourceAudit.complete,false);assert.ok(partial.sourceAudit.reasons.some(r=>/closing/.test(r)))
 const truncated=transport({options:{fetchJson:async u=>u.endsWith('/offices')?{offices}:{meta:{total:3},jobs:[role]}}})
 await assert.rejects(m.run(truncated.options),/total|truncat/i)
 await assert.rejects(m.run({...transport().options,fetchPage:async u=>({url:u,status:200,body:html.replaceAll('financialtimes33','another')})}),/handoff|binding/i)
 const c=new AbortController();c.abort();const aborted=transport();await assert.rejects(m.run({...aborted.options,signal:c.signal}),/abort/i);assert.equal(aborted.calls.length,0)
})

test('FT retains complete primary proof but stops at denied advertised fellowship information and withholds company totals',async()=>{
 const m=await load(),t=transport(),original=t.options.fetchPage
 t.options.fetchPage=async url=>url.startsWith('https://aboutus.ft.com/')?{...(await original(url)),body:html.replace('</body>','<a href="https://www.ft.com/maisiefellowship">Maisie Hylton Fellowship</a><a href="https://www.ft.com/brittanfellowship">Sir Samuel Brittan Fellowship</a></body>')}:(t.calls.push(url),{url,status:403,body:'<title>Security Verification</title>'})
 const jobs=await m.run(t.options)
 assert.equal(jobs.sourceAudit.nativePostings,2);assert.equal(jobs.sourceAudit.nativeInventoryComplete,true)
 assert.equal(jobs.sourceAudit.complete,false);assert.equal(jobs.sourceAudit.wholeCompanyIndia,null);assert.equal(jobs.sourceAudit.wholeCompanyGlobal,null)
 assert.equal(jobs.sourceAudit.additionalRecruitmentScopes[0].status,403)
 assert.equal(t.calls.at(-1),'https://www.ft.com/maisiefellowship');assert.equal(t.calls.includes('https://www.ft.com/brittanfellowship'),false)
})

test('FT retains structured public criteria, current talent classification and strict original calendar dates',async()=>{
 const m=await load(),g=m.buildOfficeGraph({offices})
 const j=m.parseFinancialTimesRole({...role,include_ai_disclaimer:true,ai_disclaimer:'<p>Disclose AI use.</p>',questions:[{label:'Portfolio &amp; experience',required:true,fields:[{values:[{label:'Three years'},{label:'Five years'}]}]}]},g)
 for(const t of ['Disclose AI use.','Portfolio & experience','Required','Three years','Five years'])assert.ok(j.sourceDescription.includes(t))
 const talent=m.parseFinancialTimesRole({...role,title:'Join our Talent Community and Build a Newsworthy Career',location:{name:'Global'},offices:[]},g)
 assert.equal(talent.nativeNonVacancy,true);assert.equal(talent.sourceIndiaEligible,false);assert.equal(talent.country,null)
 const expired=m.parseFinancialTimesRole({...role,application_deadline:'2026-10-21T00:00:00Z'},g,{now:'2026-10-27T00:00:00Z'});assert.equal(expired.nativeVacancy,false)
 assert.throws(()=>m.parseFinancialTimesRole({...role,first_published:'2026-02-30T00:00:00Z'},g),/date|calendar/i)
})

test('FT follows actual hiring context for opaque advertised program links and preserves healthy primary India roles',async()=>{
 const m=await load(),t=transport(),original=t.options.fetchPage
 t.options.fetchPage=async url=>({...await original(url),body:html.replace('</body>','<p>Applications for our fellowship open Autumn 2026. <a href="https://partner.example/program/123">Read more</a></p></body>')})
 const jobs=await m.run(t.options)
 assert.equal(jobs.length,2);assert.equal(jobs.sourceAudit.nativeInventoryComplete,true);assert.equal(jobs.sourceAudit.complete,false)
 assert.ok(jobs.sourceAudit.additionalRecruitmentScopes.some(s=>s.url==='https://partner.example/program/123'))
 assert.equal(t.calls.some(u=>u.startsWith('https://partner.example')),false)
})

test('FT stops 200 bot gates and recognises an opaque external Apply now handoff',async()=>{
 const m=await load(),gate=transport()
 await assert.rejects(m.run({...gate.options,fetchPage:async url=>{gate.calls.push(url);return{url,status:200,body:'<title>Security Verification</title>'}}}),/denied|gate/i)
 assert.deepEqual(gate.calls,['https://aboutus.ft.com/'])
 const t=transport(),original=t.options.fetchPage
 t.options.fetchPage=async url=>({...await original(url),body:html.replace('</body>','<a href="https://partner.example/opaque/123">Apply now</a></body>')})
 const jobs=await m.run(t.options);assert.equal(jobs.sourceAudit.complete,false);assert.ok(jobs.sourceAudit.additionalRecruitmentScopes.some(s=>s.url==='https://partner.example/opaque/123'))
})
