import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createIamneoScraper} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const dir=new URL('../../../artifacts/scraper-coverage-repairs-2026-10-29/keka-next-sources/',import.meta.url)
const fixture=name=>readFileSync(new URL(name,dir),'utf8')
const root='https://iamneo.keka.com/careers/'
const id='4ce06eef-5046-4d49-9a10-57a546e5f2ca'
export function transport(change){const bodies=new Map([['https://iamneo.ai/careers/',fixture('1793299929946-0.txt')],[root.slice(0,-1),fixture('1793299928568-1.txt')],['https://cdn.keka.com/careers/v/2026/scripts/app/app.min.js',fixture('1793300128839-3.txt')],[`${root}api/organization/default/careerportalinfo`,fixture('1793300030183-0.txt')],[`${root}api/embedjobs/default/active/${id}`,fixture('1793300030251-1.txt')],[`${root}api/jobs/default/active`,fixture('1793300030237-2.txt')],[`${root}api/organization/grouplinkstatus`,'{"isGroupLinked":false}'],[`${root}api/embedjobs/grouplinkstatus/${id}`,'{"isGroupLinked":false}']]);let board=0;return async url=>{let body=bodies.get(url);if(url.startsWith(`${root}jobdetails/`))body=fixture(`iamneo-detail-${url.split('/').at(-1)}.html`);assert.notEqual(body,undefined,`unexpected URL ${url}`);if(url===`${root}api/jobs/default/active`)board++;body=change?.(url,body,board)??body;return {status:200,url,text:async()=>body}}}
