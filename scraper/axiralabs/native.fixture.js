import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createAxiraLabsScraper} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const artifact=new URL('../../../artifacts/scraper-coverage-repairs-2026-10-29/keka-next-sources/',import.meta.url)
const fixture=name=>readFileSync(new URL(name,artifact),'utf8')
const root='https://achiralabs.keka.com/careers/'
const id='cb843558-f2a1-40ac-8f36-6f76990f5364'
const official='https://achiralabs.com/careers'
export function transport(change){const bodies=new Map([[official,fixture('1793299930189-2.txt')],[`${root}api/embedjobs/js/${id}`,fixture('1793299928660-3.txt')],[`${root}api/organization/default/careerportalinfo`,fixture('1793299997244-0.txt')],[`${root}api/embedjobs/default/active/${id}`,'[]'],[`${root}api/jobs/default/active`,'[]'],[`${root}api/embedjobs/grouplinkstatus/${id}`,'{"isGroupLinked":false}'],[`${root}api/organization/grouplinkstatus`,'{"isGroupLinked":false}']]);let active=0;return async url=>{assert.ok(bodies.has(url),`unexpected URL ${url}`);let body=bodies.get(url);if(url.includes('/active/'))active++;body=change?.(url,body,active)??body;return {status:200,url,text:async()=>body}}}
