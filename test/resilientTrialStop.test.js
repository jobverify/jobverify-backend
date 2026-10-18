import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {parseArgs,runResilientScrape} from '../scripts/resilientLocalScrape.js';
test('external resource abort stops owned runner without a writable stop-request file',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'job-resource-stop-'));try{
 const script=path.join(dir,'fake-runner.mjs');await fs.writeFile(script,"setInterval(()=>{},1000);process.on('message',message=>{if(message.type==='jobverify:shutdown')process.exit(0)});setTimeout(()=>process.exit(0),1800);");
 // A directory at the stop-file path simulates EACCES/EISDIR without changing privileges.
 await fs.mkdir(path.join(dir,'stop-request.json'));const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(new Error('RAM limit')),200);const started=Date.now();
 await runResilientScrape(parseArgs(['--run-dir',dir,'--dry-run','--runner-script',script,'--max-restarts','0','--shutdown-grace-seconds','1']),{signal:controller.signal,prepareLaya:async({env})=>({env,stop:async()=>{}})});clearTimeout(timer);
 assert.ok(Date.now()-started<1300,'resource abort did not promptly stop runner');
 const state=JSON.parse(await fs.readFile(path.join(dir,'run-exit.json'),'utf8'));assert.equal(state.stopRequested,true);
 }finally{assert.ok(path.basename(dir).startsWith('job-resource-stop-'));await fs.rm(dir,{recursive:true,force:true});}
});
