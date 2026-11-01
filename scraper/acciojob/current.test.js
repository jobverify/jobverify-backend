import test from 'node:test'
import assert from 'node:assert/strict'
import {createAcciojobScraper} from './script.js'
import {transport} from '../acciojob/current.fixture.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
test('acciojob traverses current official handoff and complete native API inventory',async()=>{const jobs=await createAcciojobScraper().run({fetchImpl:transport(),requestIntervalMs:0});assert.equal(jobs.length,0);assert.equal(readInventoryEvidence(jobs)?.status,'coverage-gap');})
test('acciojob does not certify complete source scope after another renderer channel appears',async()=>{const jobs=await createAcciojobScraper().run({fetchImpl:transport((url,body)=>url.includes('/api/embedjobs/js/')?body+`;document.body.insertAdjacentHTML('beforeend','<a href="https://jobs.ashbyhq.com/another">More roles</a>');`:body),requestIntervalMs:0});assert.equal(readInventoryEvidence(jobs)?.listingComplete,false);assert.equal(readInventoryEvidence(jobs)?.reportedTotal,null)})
test('Accio retains unknown employer totals while its advertised placement feeds are not employer-reconciled',async()=>{const jobs=await createAcciojobScraper().run({fetchImpl:transport()});assert.equal(readInventoryEvidence(jobs)?.listingComplete,false);assert.equal(readInventoryEvidence(jobs)?.reportedTotal,null);assert.match(readInventoryEvidence(jobs)?.reason,/placement/)})
