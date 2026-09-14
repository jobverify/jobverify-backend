import assert from 'node:assert/strict'
import test from 'node:test'
import { getScraperCatalog } from '../providers/index.js'
import quadeye from '../../scraper/quadeye/catalog.js'
import vgs from '../../scraper/verygoodsecurityindia/catalog.js'
test('QuadEye and VGS effective catalogs describe the verified complete public inventories',()=>{
 const catalog=getScraperCatalog()
 for(const local of [quadeye,vgs]){
  const effective=catalog.find(p=>p.source===local.source)
  for(const key of ['verifiedOn','atsPlatform','paginationStrategy','extractionStrategy','verifiedSurfaceSummary'])assert.equal(effective[key],local[key],local.source+' '+key)
  assert.equal(effective.verifiedOn,'2026-09-13')
 }
 assert.equal(vgs.atsPlatform,'lever')
 assert.match(vgs.verifiedSurfaceSummary,/16 public roles.*0 India/i)
 assert.match(quadeye.verifiedSurfaceSummary,/20 current public India roles/i)
})
