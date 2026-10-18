import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfiguration, validateConfiguration, createStages, directConfiguration, stageOutcome } from '../src/pipeline/policy.js';
import { selectClassificationDescription } from '../src/services/classificationDescription.js';
import { buildRewriteInput } from '../src/services/jobDescriptionPolicy.js';

test('all permutations and enabled subsets preserve configured order', () => {
  const permutations = a => a.length ? a.flatMap((v,i) => permutations(a.filter((_,j)=>j!==i)).map(rest=>[v,...rest])) : [[]];
  for (const order of permutations(['scraper','rewrite','classification'])) for (let mask=1;mask<8;mask++) {
    const stages=order.map((key,i)=>({key,enabled:Boolean(mask & (1<<i))}));
    assert.deepEqual(createStages(validateConfiguration({stages})).map(s=>s.key),order);
    assert.deepEqual(createStages({stages}).filter(s=>s.status==='waiting').map(s=>s.key),stages.filter(s=>s.enabled).map(s=>s.key));
  }
  for (const stages of [[], [{key:'scraper',enabled:true}], defaultConfiguration().stages.map(s=>({...s,enabled:false})), [{key:'scraper',enabled:true},{key:'scraper',enabled:true},{key:'rewrite',enabled:true}]]) assert.throws(()=>validateConfiguration({stages}));
});
test('direct GitHub starts use the fixed suffix and ignore admin configuration', () => {
  assert.deepEqual(directConfiguration('rewrite').stages.filter(s=>s.enabled).map(s=>s.key),['rewrite','classification']);
  assert.equal(createStages(defaultConfiguration()).filter(s=>s.status==='waiting').length,3);
});
test('outcomes stop failed or unfinished work but accept empty queues and deliberate skips', () => {
  assert.equal(stageOutcome('rewrite',{queued:0,reason:'empty_queue'},0),'completed');
  assert.equal(stageOutcome('rewrite',{skipped:5},0),'completed');
  assert.equal(stageOutcome('rewrite',{failed:1},0),'failed');
  assert.equal(stageOutcome('rewrite',{pendingEstimate:1},0),'incomplete');
  assert.equal(stageOutcome('classification',{budgetExhausted:true},1),'incomplete');
  assert.equal(stageOutcome('scraper',{},1),'failed');
  assert.equal(stageOutcome('rewrite',{reason:'interrupted'},0),'incomplete');
});
test('classification uses only a current published rewrite with original fallback and identity', () => {
  const original={sourceDescription:'Employer original',description:'Validated rewrite'};
  original.sourceContentHash=buildRewriteInput(original).inputHash;
  original.descriptionRewrite={status:'published',inputHash:original.sourceContentHash,policyVersion:'v1'};
  const selected=selectClassificationDescription(original);
  assert.equal(selected.text,'Validated rewrite'); assert.equal(selected.origin,'rewrite');
  assert.equal(selectClassificationDescription({...original,sourceContentHash:'changed'}).text,'Employer original');
  assert.equal(selectClassificationDescription({...original,sourceDescription:'Edited employer original'}).text,'Edited employer original');
  assert.equal(selectClassificationDescription({...original,description:'  '}).text,'Employer original');
  assert.equal(selectClassificationDescription({...original,descriptionRewrite:{status:'skipped'}}).origin,'source');
});
