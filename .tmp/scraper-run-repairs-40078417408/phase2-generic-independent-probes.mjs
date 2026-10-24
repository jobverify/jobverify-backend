import assert from 'node:assert/strict';
import test from 'node:test';
import {enrichJobWithPublicExperience,enrichJobsWithPublicExperience} from 'file:///C:/Users/mohv/GitHub/Release-26.11.01/jobverify-backend/scraper-support/utils/publicExperienceEnrichment.js';
import {publicPostingDescription} from 'file:///C:/Users/mohv/GitHub/Release-26.11.01/jobverify-backend/rewriting/publicPostingDescription.js';
import {normalizeScrapedJob} from 'file:///C:/Users/mohv/GitHub/Release-26.11.01/jobverify-backend/scraper-support/utils/normalizeScrapedJob.js';
import {hasSourceDescription} from 'file:///C:/Users/mohv/GitHub/Release-26.11.01/jobverify-backend/src/utils/jobSourceContent.js';
const job={title:'Platform Engineer',company:'Example Employer',source:'exampleemployer',jobId:'R100',country:'India',location:'Bengaluru, India',sourceUrl:'https://careers.example.com/job/R100',sourceDescription:null,description:null,jobDescription:null};
const description='<p>Build reliable cloud services and distributed systems for engineering teams. 5 years of software engineering experience required.</p>';
const posting=url=>({'@type':'JobPosting',title:job.title,hiringOrganization:{name:job.company},identifier:{value:job.jobId},url,description});
const html=url=>`<script type="application/ld+json">${JSON.stringify(posting(url))}</script>`;
const receipt=(url,status=200)=>({html:html(url),url,status});
for(const [name,response,expected] of [['exact',receipt(job.sourceUrl),true],['redirected',{...receipt(job.sourceUrl),url:'https://unrelated.example/search-jobs'},false],['403',receipt(job.sourceUrl,403),false],['text-only',html(job.sourceUrl),false]]) {
 test(`injected browser ${name} receipt`,async()=>{const result=await enrichJobWithPublicExperience(job,{fetchText:async()=>{throw Error('raw unavailable')},fetchBrowserText:async()=>response});assert.equal(hasSourceDescription(normalizeScrapedJob(result)),expected)});
}
const embedded='https://boards.greenhouse.io/exampleemployer/jobs/12345';
for(const [name,wrapper,expected] of [
 ['active successful wrapper',{html:`<iframe src="${embedded}"></iframe>`,url:job.sourceUrl,status:200},true],
 ['commented iframe',{html:`<!--<iframe src="${embedded}"></iframe>-->`,url:job.sourceUrl,status:200},false],
 ['template iframe',{html:`<template><iframe src="${embedded}"></iframe></template>`,url:job.sourceUrl,status:200},false],
 ['srcdoc iframe',{html:`<iframe src="${embedded}" srcdoc="<p>Job unavailable</p>"></iframe>`,url:job.sourceUrl,status:200},false],
 ['empty srcdoc iframe',{html:`<iframe src="${embedded}" srcdoc=""></iframe>`,url:job.sourceUrl,status:200},false],
 ['failed wrapper',{html:`<iframe src="${embedded}"></iframe>`,url:job.sourceUrl,status:403},false],
 ['redirected wrapper',{html:`<iframe src="${embedded}"></iframe>`,url:'https://unrelated.example/search-jobs',status:200},false],
 ['text-only wrapper',`<iframe src="${embedded}"></iframe>`,false],
]) {
 test(`embedded receipt: ${name}`,async()=>{const result=await enrichJobWithPublicExperience(job,{fetchText:async url=>url===job.sourceUrl?wrapper:receipt(embedded)});assert.equal(hasSourceDescription(normalizeScrapedJob(result)),expected)});
}
test('hash route mismatch does not identify the same role',()=>{const sourceUrl='https://careers.example.com/#/job/R100';const schema={...posting('https://careers.example.com/#/job/R101')};delete schema.identifier;assert.equal(publicPostingDescription({...job,sourceUrl},`<script type="application/ld+json">${JSON.stringify(schema)}</script>`,sourceUrl),null)});
test('built-in browser fallback validates final URL and status receipts',async()=>{const original=globalThis.fetch;try{for(const [name,url,status,expected] of [['exact',job.sourceUrl,200,true],['redirect','https://unrelated.example/search-jobs',200,false],['403',job.sourceUrl,403,false]]){let fetches=0;globalThis.fetch=async()=>{fetches++;return {ok:status>=200&&status<300,status,url,headers:{get:()=> 'text/html'},text:async()=>html(job.sourceUrl)}};const [result]=await enrichJobsWithPublicExperience([job],{concurrency:1,browserFallbackConcurrency:1,fetchText:async()=>{throw Error('raw unavailable')}});assert.equal(hasSourceDescription(result),expected,name);assert.equal(fetches,1,name)}}finally{globalThis.fetch=original}});
