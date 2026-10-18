import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPostingDescription} from '../rewriting/publicPostingDescription.js';

const job={title:'Financial Planning & Analysis, Staff',company:'Synopsys',jobId:'19219',sourceUrl:'https://careers.synopsys.com/job/hyderabad/fpa/44408/101746583184'};
const posting={ '@type':'JobPosting',title:job.title,hiringOrganization:{name:job.company},identifier:{value:job.jobId},url:job.sourceUrl,description:'<h3>What You’ll Need:</h3><p>10+ years of financial planning experience.</p>'};
const html=value=>`<script type="application/ld+json">${JSON.stringify(value)}</script>`;

test('recovers an exact employer-authored role in a schema graph',()=>{
  assert.equal(publicPostingDescription(job,html({'@graph':[posting]}),job.sourceUrl)?.description,posting.description);
});
test('rejects another role, employer or generic career page even when a description exists',()=>{
  for(const change of [{title:'Another role'},{hiringOrganization:{name:'Another employer'}},{identifier:{value:'9999'}},{url:'https://careers.synopsys.com/search-jobs'}])
    assert.equal(publicPostingDescription(job,html({...posting,...change}),job.sourceUrl),null);
  assert.equal(publicPostingDescription(job,html(posting),'https://careers.synopsys.com/search-jobs'),null);
});
test('rejects malformed or ambiguous role schemas',()=>{
  assert.equal(publicPostingDescription(job,'<script type="application/ld+json">{broken</script>',job.sourceUrl),null);
  assert.equal(publicPostingDescription(job,html([posting,posting]),job.sourceUrl),null);
});
