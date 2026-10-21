import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import PipelineRun from '../src/models/PipelineRun.js';

test('GitHub CLI registers direct roots, reports work and dispatches separate correlated stages',{timeout:300000},async t=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pipeline-github-cli-'));
 const mongo=await MongoMemoryServer.create({binary:{version:'8.2.6',downloadDir:fileURLToPath(new URL('../.cache/mongodb-binaries/',import.meta.url))}});
 await mongoose.connect(mongo.getUri());
 t.after(async()=>{await mongoose.disconnect();await mongo.stop();await fs.rm(directory,{recursive:true,force:true});});
 const script=fileURLToPath(new URL('../scripts/pipelineGithub.js',import.meta.url));
 const hook=path.join(directory,'mock-github.mjs'),eventFile=path.join(directory,'event.json'),dispatchFile=path.join(directory,'dispatches.jsonl');
 await fs.writeFile(hook,`import fs from 'node:fs';
 globalThis.fetch=async(url,options={})=>{
  if(url.includes('/actions/runs/'))return Response.json({id:Number(process.env.TEST_REMOTE_RUN_ID),status:'completed',conclusion:'success'});
  if(url.endsWith('/dispatches')){fs.appendFileSync(process.env.TEST_DISPATCH_LOG,JSON.stringify({url,body:JSON.parse(options.body)})+'\\n');return new Response(null,{status:204});}
  throw new Error('Unexpected mocked GitHub request');
 };`);
 const exec=promisify(execFile);
 const env={...process.env,MONGO_URI:mongo.getUri(),GH_TOKEN:'test-only',GITHUB_REPOSITORY:'owner/jobs',GITHUB_REF_NAME:'main',PIPELINE_DEFAULT_BRANCH:'main',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_PATH:eventFile,TEST_DISPATCH_LOG:dispatchFile,PIPELINE_ID:'',PIPELINE_DISPATCH_TOKEN:''};
 const run=async(command,key,id,extra={})=>exec(process.execPath,['--import',pathToFileURL(hook).href,script,command],{cwd:directory,windowsHide:true,env:{...env,PIPELINE_STAGE:key,GITHUB_RUN_ID:String(id),GITHUB_OUTPUT:path.join(directory,'outputs'),...extra}});
 const complete=async(key,name,id)=>{
  await fs.writeFile(eventFile,JSON.stringify({repository:{default_branch:'main'},workflow_run:{id,name,head_branch:'main',display_title:`${key} | |`}}));
  await run('complete',key,id,{TEST_REMOTE_RUN_ID:String(id)});
 };
 await run('register','scraper',1100);
 let record=await PipelineRun.findOne().lean();assert.equal(record.stages[0].githubRunId,1100);
 await fs.mkdir(path.join(directory,'.cache/scraper-actions'),{recursive:true});
 await fs.writeFile(path.join(directory,'.cache/scraper-actions/pipeline-scraper-summary.json'),JSON.stringify({failed:0,scanned:1}));
 await run('report','scraper',1100,{PIPELINE_JOB_RESULT:'success'});
 await complete('scraper','Jobverify Scraper Cron',1100);
 record=await PipelineRun.findById(record._id).lean();assert.equal(record.stages[1].status,'queued');
 await run('register','rewrite',1101,{PIPELINE_ID:record._id,PIPELINE_DISPATCH_TOKEN:record.stages[1].dispatchToken});
 await fs.writeFile(path.join(directory,'.cache/scraper-actions/description-summary.json'),JSON.stringify({queued:3103,published:2793,skipped:309,failed:1,warnings:1,pendingEstimate:0}));
 await run('report','rewrite',1101,{PIPELINE_JOB_RESULT:'success'});
 await complete('rewrite','Jobverify Description Rewrite',1101);
 record=await PipelineRun.findById(record._id).lean();assert.equal(record.stages[2].status,'queued');
 assert.equal(record.stages[1].status,'completed');assert.equal(record.stages[1].summary.failed,1);assert.equal(record.stages[1].summary.warnings,1);
 await run('register','classification',1102,{PIPELINE_ID:record._id,PIPELINE_DISPATCH_TOKEN:record.stages[2].dispatchToken});
 for(let shard=0;shard<4;shard++)await fs.writeFile(path.join(directory,`.cache/scraper-actions/classification-${shard}.json`),JSON.stringify({completed:1,failed:0}));
 await run('report','classification',1102,{PIPELINE_JOB_RESULT:'success'});
 await complete('classification','Jobverify Post-scrape Classification',1102);
 record=await PipelineRun.findById(record._id).lean();assert.equal(record.status,'completed');assert.equal(record.stages[2].summary.completed,4);
 const dispatched=(await fs.readFile(dispatchFile,'utf8')).trim().split('\n').map(JSON.parse);
 assert.equal(dispatched.length,2);assert.match(dispatched[0].url,/rewrite-descriptions.yml/);assert.match(dispatched[1].url,/classify-jobs.yml/);
 assert.ok(dispatched.every(item=>item.body.inputs.pipeline_id===record._id&&item.body.inputs.pipeline_sha===env.GITHUB_SHA));
});
