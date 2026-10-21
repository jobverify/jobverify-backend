import test from 'node:test'
import assert from 'node:assert/strict'
import {run} from './script.js'

test('current HTTP403 challenge cannot be returned as a successful zero',async()=>{
 let requested=0
 await assert.rejects(()=>run({fetchImpl:async url=>{requested++;return{status:403,url,text:async()=>'<title>Just a moment...</title><div id="challenge-running">Verify you are human</div>'}}}),/HTTP|unavailable|blocked/i)
 assert.equal(requested,1)
})

test('caller cancellation cannot become a successful zero or start a request',async()=>{
 const c=new AbortController();c.abort(Error('Checkmarx caller cancelled'))
 await assert.rejects(()=>run({signal:c.signal,fetchImpl:()=>{assert.fail('A cancelled source must not request')}}),/cancelled/)
})
