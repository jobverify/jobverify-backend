import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');
test('stages have separate manual workflows and only the completion observer advances runs',()=>{
 for(const file of ['scraper.yml','rewrite-descriptions.yml','classify-jobs.yml']) {
  const workflow=read(file);assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/workflow_run:/);
  assert.match(workflow,/pipelineGithub.js register/);assert.match(workflow,/pipelineGithub.js report/);
  assert.doesNotMatch(workflow,/continue-on-error: true|JOB_DESCRIPTION_REWRITE_AUTO_RUN/);
 }
 const observer=read('pipeline-completion.yml');
 assert.match(observer,/workflow_run:/);assert.match(observer,/actions: write/);assert.match(observer,/pipelineGithub.js complete/);
 assert.match(observer,/head_repository.full_name == github.repository/);
});

test('rewrite parallelism stays inside a single GitHub job',()=>{
 const workflow=read('rewrite-descriptions.yml');
 const jobs=workflow.split('\njobs:\n')[1].match(/^  [a-z_]+:\s*$/gm)||[];
 assert.deepEqual(jobs.map(value=>value.trim()),['rewrite_descriptions:']);
 assert.doesNotMatch(workflow,/matrix:|max-parallel:|JOB_DESCRIPTION_REWRITE_SHARD/);
 assert.match(workflow,/JOB_DESCRIPTION_REWRITE_CONCURRENCY: \$\{\{ vars\.JOB_DESCRIPTION_REWRITE_CONCURRENCY \|\| '4' \}\}/);
 assert.match(workflow,/JOB_DESCRIPTION_REWRITE_CPU_THREADS: '4'/);
 assert.equal((workflow.match(/pipelineGithub.js register/g)||[]).length,1);
 assert.equal((workflow.match(/pipelineGithub.js report/g)||[]).length,1);
});
