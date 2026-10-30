import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createSmartCoinScraper} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const dir=new URL('../../../artifacts/scraper-coverage-repairs-2026-10-29/keka-next-sources/',import.meta.url)
const fixture=name=>readFileSync(new URL(name,dir),'utf8')
const root='https://smartcoin.keka.com/careers/'
const id='a6d6f744-09bc-4a25-8a31-edb4868b09bc'
export function transport(change){const bodies=new Map([['https://www.olyv.co.in/about-us',fixture('1793299928827-4.txt')],[root.slice(0,-1),fixture('1793299928929-5.txt')],['https://smartcoin.keka.com/ats/documents/'+id+'/careerportal/50951899fde2472ba9b69ebb60f3938e.html',fixture('1793299997295-4.txt')],[`${root}api/embedjobs/js/${id}`,fixture('1793300030320-8.txt')],[`${root}api/organization/default/careerportalinfo`,fixture('1793300030209-4.txt')],[`${root}api/embedjobs/default/active/${id}`,fixture('1793300030402-5.txt')],[`${root}api/jobs/default/active`,fixture('1793300030479-6.txt')],[`${root}api/embedjobs/grouplinkstatus/${id}`,'{"isGroupLinked":false}'],[`${root}api/organization/grouplinkstatus`,'{"isGroupLinked":false}']]);return async url=>{let body=bodies.get(url);if(url.startsWith(`${root}jobdetails/`))body=fixture(`smartcoin-detail-${url.split('/').at(-1)}.html`);assert.notEqual(body,undefined,`unexpected URL ${url}`);body=change?.(url,body)??body;return {status:200,url,text:async()=>body}}}
