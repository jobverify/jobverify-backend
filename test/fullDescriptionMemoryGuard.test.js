import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runMemoryLimitedChild} from '../scripts/runFullDescriptionDryRun.js';

test('RAM above 90 kills its real child, preserves the cutoff and stays stopped',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'description-guard-'));
  let samples=0;
  const outcome=await runMemoryLimitedChild({runDir:directory,command:process.execPath,args:['-e','setInterval(()=>{},1000)'],intervalMs:100,
    sample:()=>({cpuPercent:100,memoryPercent:samples++<2?90:90.1})});
  assert.equal(outcome.status,'resource_stopped');assert.equal(outcome.reading.memoryPercent,90.1);
  const cutoff=JSON.parse(await fs.readFile(path.join(directory,'memory-stop.json'),'utf8'));
  assert.equal(cutoff.automaticResume,false);assert.ok(cutoff.childPid>0);
  assert.throws(()=>process.kill(cutoff.childPid,0),error=>error.code==='ESRCH');
});
test('100 percent CPU alone does not trigger the user RAM cutoff',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'description-cpu-'));
  const outcome=await runMemoryLimitedChild({runDir:directory,command:process.execPath,args:['-e','setTimeout(()=>{},200)'],intervalMs:50,
    sample:()=>({cpuPercent:100,memoryPercent:50})});
  assert.equal(outcome.status,'exited');assert.equal(outcome.exitCode,0);
});
test('already high RAM prevents even launching a child',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'description-preflight-'));
  const outcome=await runMemoryLimitedChild({runDir:directory,command:process.execPath,args:['-e','throw new Error("must not launch")'],sample:()=>({cpuPercent:0,memoryPercent:91})});
  assert.equal(outcome.status,'resource_stopped');
  const cutoff=JSON.parse(await fs.readFile(path.join(directory,'memory-stop.json'),'utf8'));assert.equal(cutoff.childPid,null);
});
