import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import '../loadEnv.js';
import { configureMongoDns } from '../src/utils/mongoDns.js';
import PipelineRun from '../src/models/PipelineRun.js';
import { createPipeline, claimStage, recordStageResult, completeWorkflow, updateStage, changeRun } from '../src/pipeline/execution.js';
import { directConfiguration, stageOutcome, WORKFLOW_NAMES, isTerminal } from '../src/pipeline/policy.js';
import { dispatchGithubStage, githubRequest } from '../src/pipeline/github.js';

const command=process.argv[2],key=process.env.PIPELINE_STAGE;
const token=process.env.GH_TOKEN;
configureMongoDns();
try {
  await mongoose.connect(process.env.MONGO_URI);
  if(command==='register') {
    if(Number(process.env.GITHUB_RUN_ATTEMPT||1)>1)throw new Error('Start a new pipeline instead of rerunning a previous workflow attempt.');
    if(process.env.GITHUB_REF_NAME!==process.env.PIPELINE_DEFAULT_BRANCH)throw new Error('Production pipelines run only on the repository default branch.');
    let id=process.env.PIPELINE_ID,dispatchToken=process.env.PIPELINE_DISPATCH_TOKEN;
    if(!id) {
      const run=await createPipeline({configuration:directConfiguration(key),target:'github',origin:'github',
        repo:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF_NAME,sha:process.env.GITHUB_SHA,initialRunId:Number(process.env.GITHUB_RUN_ID)});
      id=run._id;
    } else {
      const expected=await PipelineRun.findById(id).lean();
      if(expected?.repo!==process.env.GITHUB_REPOSITORY||expected.target!=='github')throw new Error('Repository identity mismatch.');
      await claimStage(id,key,{runId:Number(process.env.GITHUB_RUN_ID),token:dispatchToken});
    }
    await fs.appendFile(process.env.GITHUB_OUTPUT,`pipeline_id=${id}\n`);
    await updateStage(id,key,{status:'running'});
  } else if(command==='report') {
    const run=await PipelineRun.findOne({'stages.githubRunId':Number(process.env.GITHUB_RUN_ID)}).lean();
    if(!run)throw new Error('Unregistered workflow cannot report results.');
    let summary={};let code=process.env.PIPELINE_JOB_RESULT==='success'?0:1;
    if(key==='scraper') {
      try{summary=JSON.parse(await fs.readFile('.cache/scraper-actions/pipeline-scraper-summary.json','utf8'));}catch{code=1;}
    } else if(key==='rewrite') {
      try{summary=JSON.parse(await fs.readFile('.cache/scraper-actions/description-summary.json','utf8'));}catch{code=1;}
    } else if(key==='classification') {
      for(let i=0;i<4;i++) {
        let part;try{part=JSON.parse(await fs.readFile(`.cache/scraper-actions/classification-${i}.json`,'utf8'));}catch{code=1;continue;}
        for(const [name,value] of Object.entries(part)) {
          if(['failed','stale','completed','skipped','cached','assigned','scanned','leased'].includes(name)&&typeof value==='number')summary[name]=(summary[name]||0)+value;
          if(name==='budgetExhausted'&&value)summary.budgetExhausted=true;
        }
      }
    }
    const outcome=stageOutcome(key,summary,code);
    await recordStageResult(run._id,key,{outcome,summary});
    if(outcome!=='completed')process.exitCode=1;
  } else if(command==='complete') {
    const event=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
    const remote=event.workflow_run;
    if(!WORKFLOW_NAMES[remote?.name]||remote.head_branch!==event.repository.default_branch)throw new Error('Unexpected pipeline completion event.');
    let run=await PipelineRun.findOne({'stages.githubRunId':remote.id}).lean();
    // A job can fail during npm/setup before registration. Bind only a matching persisted dispatch token.
    if(!run) {
      const active=await PipelineRun.findOne({activeKey:'database',target:'github'}).lean();
      const stage=active?.stages.find(s=>s.status==='queued'&&(remote.display_title||'').includes(s.dispatchToken));
      if(stage){await changeRun(active._id,row=>{const s=row.stages.find(s=>s.key===stage.key);s.githubRunId=remote.id;s.status='preparing';});run=active;}
    }
    if(run&&!isTerminal(run.status)) {
      // Confirm authoritative completion; event payload alone never advances a different repository/run.
      const actual=await githubRequest(run.repo,`/actions/runs/${remote.id}`,{token});
      if(actual.status==='completed')await completeWorkflow(remote.id,actual.conclusion,(row,next)=>dispatchGithubStage(row,next,token));
    }
  } else throw new Error('Unknown pipeline command');
} catch(error) {
  console.error('Pipeline control failed:',error.status?error.message:error.name);
  process.exitCode=1;
} finally { await mongoose.disconnect(); }
