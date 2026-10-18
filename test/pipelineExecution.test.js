import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { fileURLToPath } from 'node:url';
import PipelineRun from '../src/models/PipelineRun.js';
import { createPipeline, claimStage, recordStageResult, completeWorkflow, dispatchNext } from '../src/pipeline/execution.js';
import { defaultConfiguration } from '../src/pipeline/policy.js';
import { reconcileGithub } from '../src/pipeline/github.js';
import { reconcileLocal } from '../src/pipeline/local.js';

test('durable pipeline claims, handoffs, failures and configuration snapshots', {timeout:300000}, async t=>{
 const mongo=await MongoMemoryServer.create({binary:{version:'8.2.6',downloadDir:fileURLToPath(new URL('../.cache/mongodb-binaries/',import.meta.url))}});
 t.after(async()=>{await mongoose.disconnect();await mongo.stop();});
 await mongoose.connect(mongo.getUri());await PipelineRun.init();
 await t.test('one database slot, exact workflow identity, duplicate completion is harmless',async()=>{
  const config=defaultConfiguration();const run=await createPipeline({configuration:config,target:'github',origin:'admin',repo:'owner/repo',ref:'main'});
  config.stages.reverse();assert.equal(run.stages[0].key,'scraper');
  await assert.rejects(createPipeline({configuration:defaultConfiguration(),target:'local',origin:'admin'}),e=>e.status===409);
  let dispatches=0;const dispatch=async()=>{dispatches++;};
  await dispatchNext(run._id,dispatch);
  const queued=await PipelineRun.findById(run._id).lean();
  const token=queued.stages[0].dispatchToken;
  await assert.rejects(claimStage(run._id,'scraper',{runId:10,token:'wrong'}));
  await claimStage(run._id,'scraper',{runId:10,token});
  await assert.rejects(claimStage(run._id,'scraper',{runId:11,token}));
  await recordStageResult(run._id,'scraper',{outcome:'completed',summary:{inserted:4}});
  await Promise.all([completeWorkflow(10,'success',dispatch),completeWorkflow(10,'success',dispatch)]);
  const next=await PipelineRun.findById(run._id).lean();
  assert.equal(next.stages[0].status,'completed');assert.equal(next.stages[1].status,'queued');assert.equal(dispatches,2);
  await claimStage(run._id,'rewrite',{runId:12,token:next.stages[1].dispatchToken});
  await recordStageResult(run._id,'rewrite',{outcome:'incomplete',summary:{pendingEstimate:5}});
  await completeWorkflow(12,'failure',dispatch);
  const stopped=await PipelineRun.findById(run._id).lean();
  assert.equal(stopped.status,'incomplete');assert.equal(stopped.stages[2].status,'blocked');assert.equal(stopped.activeKey,undefined);
 });
 await t.test('failed dispatch is terminal and releases the database slot',async()=>{
  const run=await createPipeline({configuration:defaultConfiguration(),target:'github',origin:'admin'});
  await assert.rejects(dispatchNext(run._id,async()=>{throw new Error('denied');}));
  const failed=await PipelineRun.findById(run._id).lean();assert.equal(failed.status,'failed');assert.equal(failed.activeKey,undefined);
 });
 await t.test('empty stages finish; cancellation blocks successors',async()=>{
  const run=await createPipeline({configuration:defaultConfiguration(),target:'github',origin:'github'});
  await dispatchNext(run._id,async()=>{});const row=await PipelineRun.findById(run._id).lean();
  await claimStage(run._id,'scraper',{runId:20,token:row.stages[0].dispatchToken});
  await completeWorkflow(20,'cancelled',async()=>assert.fail('must not dispatch'));
  assert.equal((await PipelineRun.findById(run._id).lean()).status,'cancelled');
 });
 await t.test('all orders and subsets execute exactly once and finish the run',async()=>{
  const permutations=a=>a.length?a.flatMap((v,i)=>permutations(a.filter((_,j)=>i!==j)).map(rest=>[v,...rest])):[[]];
  let workflowId=100;
  for(const order of permutations(['scraper','rewrite','classification']))for(let mask=1;mask<8;mask++) {
   const config={stages:order.map((key,i)=>({key,enabled:Boolean(mask&(1<<i))}))};
   const run=await createPipeline({configuration:config,target:'github',origin:'admin'});
   const dispatched=[];const dispatch=async(_row,stage)=>dispatched.push(stage.key);
   await dispatchNext(run._id,dispatch);
   for(const expected of config.stages.filter(s=>s.enabled)) {
    const current=await PipelineRun.findById(run._id).lean(),stage=current.stages.find(s=>s.status==='queued');
    assert.equal(stage.key,expected.key);const runId=++workflowId;
    await claimStage(run._id,stage.key,{runId,token:stage.dispatchToken});
    await recordStageResult(run._id,stage.key,{outcome:'completed',summary:{}});
    await completeWorkflow(runId,'success',dispatch);
   }
   assert.deepEqual(dispatched,config.stages.filter(s=>s.enabled).map(s=>s.key));
   assert.equal((await PipelineRun.findById(run._id).lean()).status,'completed');
  }
 });
 await t.test('failure before worker registration releases a queued stage bound by reconciliation',async childTest=>{
  let remoteId=500;
  for(const conclusion of ['failure','cancelled','timed_out','success']) {
   remoteId++;
   const run=await createPipeline({configuration:defaultConfiguration(),target:'github',origin:'admin',repo:'owner/jobs'});
   await dispatchNext(run._id,async()=>{});const queued=await PipelineRun.findById(run._id).lean();
   const stage=queued.stages[0];let completed=false;
   const mock=childTest.mock.method(globalThis,'fetch',async url=>{
    if(String(url).includes('/workflows/'))return Response.json({workflow_runs:[{id:remoteId,display_title:stage.dispatchToken,status:'in_progress',created_at:new Date().toISOString()}]});
    return Response.json({id:remoteId,status:completed?'completed':'in_progress',conclusion:completed?conclusion:null});
   });
   await reconcileGithub(queued,{token:'test-token'});completed=true;
   await reconcileGithub(await PipelineRun.findById(run._id).lean(),{token:'test-token'});
   const stopped=await PipelineRun.findById(run._id).lean();
   assert.equal(stopped.status,conclusion==='cancelled'?'cancelled':'failed');
   assert.equal(stopped.activeKey,undefined);mock.mock.restore();
  }
 });
 await t.test('stale local worker is interrupted while fresh heartbeat and cross-target locking remain intact',async()=>{
  const run=await createPipeline({configuration:defaultConfiguration(),target:'local',origin:'admin'});
  assert.equal((await reconcileLocal(run)).status,'running');
  const owner=await PipelineRun.findOneAndUpdate({_id:run._id,localOwner:{$exists:false}},{$set:{localOwner:'test-owner'}},{new:true}).lean();
  assert.equal(owner.localOwner,'test-owner');
  assert.equal(await PipelineRun.findOneAndUpdate({_id:run._id,localOwner:{$exists:false}},{$set:{localOwner:'duplicate'}}),null);
  await dispatchNext(run._id,async()=>{});const current=await PipelineRun.findById(run._id).lean();
  await claimStage(run._id,'scraper',{token:current.stages[0].dispatchToken,owner:'test-owner'});
  await PipelineRun.updateOne({_id:run._id},{$set:{heartbeatAt:new Date(Date.now()-180000)}});
  const stopped=await reconcileLocal(await PipelineRun.findById(run._id).lean());
  assert.equal(stopped.status,'interrupted');assert.equal(stopped.stages[0].status,'interrupted');assert.equal(stopped.stages[1].status,'blocked');assert.equal(stopped.activeKey,undefined);
 });
 await t.test('direct starts bind their initiating workflow atomically before processing',async()=>{
  const run=await createPipeline({configuration:defaultConfiguration(),target:'github',origin:'github',initialRunId:900});
  assert.equal(run.stages[0].status,'preparing');assert.equal(run.stages[0].githubRunId,900);
  await completeWorkflow(900,'failure',async()=>assert.fail('must not continue'));
  assert.equal((await PipelineRun.findById(run._id).lean()).status,'failed');
 });
});
