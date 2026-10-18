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
