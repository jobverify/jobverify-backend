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

test('rewrite sizes its runner matrix from the queue between one registration and one aggregate report',()=>{
 const workflow=read('rewrite-descriptions.yml');
 const jobs=workflow.split('\njobs:\n')[1].match(/^  [a-z_]+:\s*$/gm)||[];
 assert.deepEqual(jobs.map(value=>value.trim()),['register:','rewrite_descriptions:','report:']);
 assert.match(workflow,/name: Rewrite job descriptions \(shard \$\{\{ matrix.shard \}\}\)/);
 assert.match(workflow,/needs: register/);
 assert.match(workflow,/fail-fast: false/);
 assert.match(workflow,/planDescriptionRewrites.js/);
 assert.match(workflow,/matrix: \$\{\{ fromJSON\(needs.register.outputs.matrix\) \}\}/);
 assert.match(workflow,/max-parallel: \$\{\{ fromJSON\(needs.register.outputs.max_parallel\) \}\}/);
 assert.match(workflow,/JOB_DESCRIPTION_REWRITE_SHARD: \$\{\{ matrix.shard \}\}/);
 assert.match(workflow,/JOB_DESCRIPTION_REWRITE_SHARD_COUNT: \$\{\{ needs.register.outputs.shard_count \}\}/);
 assert.match(workflow,/JOB_DESCRIPTION_REWRITE_QUEUE_AS_OF: \$\{\{ needs.register.outputs.queue_as_of \}\}/);
 assert.match(workflow,/PIPELINE_SUMMARY_FILE: '.cache\/scraper-actions\/description-summary-\$\{\{ matrix.shard \}\}.json'/);
 assert.match(workflow,/JOB_DESCRIPTION_REWRITE_CONCURRENCY: \$\{\{ vars\.JOB_DESCRIPTION_REWRITE_CONCURRENCY \|\| '4' \}\}/);
 assert.match(workflow,/JOB_DESCRIPTION_REWRITE_CPU_THREADS: '4'/);
 assert.match(workflow,/name: description-rewrite-\$\{\{ matrix.shard \}\}-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/);
 assert.match(workflow,/key: description-lfm12b-rewrites-.*shard-\$\{\{ matrix.shard \}\}/);
 assert.match(workflow,/description-worker-\$\{\{ matrix.shard \}\}.log/);
 assert.match(workflow,/description-rejections-\$\{\{ matrix.shard \}\}.json/);
 assert.match(workflow,/needs: \[register, rewrite_descriptions\]/);
 assert.match(workflow,/if: always\(\) && needs.register.result == 'success'/);
 assert.match(workflow,/pattern: description-rewrite-\*-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/);
 assert.match(workflow,/merge-multiple: true/);
 assert.match(workflow,/PIPELINE_JOB_RESULT: \$\{\{ needs.rewrite_descriptions.result \}\}/);
 assert.equal((workflow.match(/pipelineGithub.js register/g)||[]).length,1);
 assert.equal((workflow.match(/pipelineGithub.js report/g)||[]).length,1);
});
