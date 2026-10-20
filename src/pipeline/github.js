import PipelineRun from '../models/PipelineRun.js';
import { WORKFLOWS, isTerminal } from './policy.js';
import { changeRun, completeWorkflow, dispatchNext, failPipeline, pipelineError } from './execution.js';

export async function githubRequest(repo,endpoint,{token=process.env.GITHUB_PAT,method='GET',body}={}) {
  if(!token||!/^[-\w.]+\/[-\w.]+$/.test(repo||''))throw pipelineError('Configure GITHUB_REPO and GITHUB_PAT with Actions read/write access.',503);
  let response;
  try { response=await fetch(`https://api.github.com/repos/${repo}${endpoint}`,{method,
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)}); }
  catch { throw pipelineError('GitHub could not be reached. Refresh status to reconcile the run.',502); }
  if(!response.ok)throw pipelineError(`GitHub returned ${response.status}. Check workflow deployment and repository Actions permissions.`,502);
  return response.status===204?null:response.json();
}
export const dispatchGithubStage=(run,stage,token=process.env.GITHUB_PAT)=>githubRequest(run.repo,`/actions/workflows/${WORKFLOWS[stage.key]}/dispatches`,{
  token,method:'POST',body:{ref:run.ref,inputs:{pipeline_id:run._id,dispatch_token:stage.dispatchToken,pipeline_sha:run.sha||''}},
});

/** Keep internal dispatch identity in job metadata instead of workflow-list titles. */
export async function matchesGithubStage(repo,remote,stage,token=process.env.GITHUB_PAT) {
  if(!stage.dispatchToken)return false;
  // Previously dispatched workflows still carry identity in their title.
  if((remote.display_title||remote.name||'').includes(stage.dispatchToken))return true;
  const label={scraper:'Scraper',rewrite:'Description Rewrite',classification:'Job Classification'}[stage.key];
  if(!label||!new RegExp(`^${label} #\\d+$`).test(remote.display_title||''))return false;
  const data=await githubRequest(repo,`/actions/runs/${remote.id}/jobs?per_page=100`,{token});
  return data.jobs?.some(job=>job.name===`${label} [dispatch:${stage.dispatchToken}]`)||false;
}

/** Repair missed observer events using exact run IDs/tokens, never the latest unrelated run. */
export async function reconcileGithub(run,{token=process.env.GITHUB_PAT,advance=true}={}) {
  if(!run||run.target!=='github'||isTerminal(run.status))return run;
  const stage=run.stages.find(s=>['queued','preparing','running'].includes(s.status));
  if(!stage) {
    if(advance)await dispatchNext(run._id,(row,next)=>dispatchGithubStage(row,next,token));
    return PipelineRun.findById(run._id).lean();
  }
  let remote;
  if(stage.githubRunId) remote=await githubRequest(run.repo,`/actions/runs/${stage.githubRunId}`,{token});
  else {
    const data=await githubRequest(run.repo,`/actions/workflows/${WORKFLOWS[stage.key]}/runs?event=workflow_dispatch&per_page=100`,{token});
    for(const candidate of data.workflow_runs||[]) {
      if(await matchesGithubStage(run.repo,candidate,stage,token)){remote=candidate;break;}
    }
    if(remote)await changeRun(run._id,row=>{
      const current=row.stages.find(s=>s.key===stage.key);
      if(current.status!=='queued')return false;
      current.githubRunId=remote.id;
      if(remote.status==='completed'){current.status='preparing';current.startedAt=new Date(remote.run_started_at||remote.created_at);}
    });
  }
  if(remote?.status==='completed'&&advance) {
    await completeWorkflow(remote.id,remote.conclusion,(row,next)=>dispatchGithubStage(row,next,token));
  } else if(!remote&&Date.now()-new Date(stage.queuedAt).getTime()>24*60*60*1000) {
    await failPipeline(run._id,'failed','No matching GitHub run appeared within 24 hours.');
  }
  return PipelineRun.findById(run._id).lean();
}
