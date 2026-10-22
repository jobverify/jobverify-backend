import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import {getScraperCatalog,DEFAULT_PROVIDER_EXTENSION_DIR} from '../../scraper-support/providers/index.js'
import metadata from './catalog.js'
test('Abbott registered mapping selects source-local Phenom validation with unknown static counts',()=>{
 const providers=getScraperCatalog(),matches=providers.filter(p=>p.source==='abbott');assert.equal(providers.length,4587);assert.equal(matches.length,1)
 const p=matches[0];assert.equal(p.atsPlatform,'phenom-native-abbott-external');assert.equal(p.adapter,'script');assert.match(p.modulePath,/abbott\.workday[\\/]script\.js$/)
 for(const key of ['verifiedOn','verifiedAt','verifiedIndiaJobCount','verifiedPublicJobCount','originalModulePath'])assert.equal(p[key],null)
 assert.equal(p.zeroResultPolicy,'evidence-required');assert.equal(p.sourceScopeComplete,false);assert.equal(p.bindingEvidence.verified,true);assert.equal(p.bindingEvidence.applicationsOpened,false)
 assert.equal(p.companyCareerPage,'https://www.abbott.in/careers.html');assert.equal(metadata.atsPlatform,p.atsPlatform)
})
test('mandatory actual provider derives from existing exact 41-z 00060 seed',()=>{
 const seed=fs.readdirSync(DEFAULT_PROVIDER_EXTENSION_DIR).filter(n=>/^z{41}-verified-discovery-adapters-00060\.json$/.test(n));assert.equal(seed.length,1)
 const actual=seed[0].replace('00060','00061');const list=JSON.parse(fs.readFileSync(path.join(DEFAULT_PROVIDER_EXTENSION_DIR,actual),'utf8'));assert.equal(list.length,1);assert.equal(list[0].source,'abbott');assert.equal(list[0].catalogOverride,true)
})
