import fs from 'node:fs';
import { run as runDetroit } from '../scraper/detroitengineeredproducts/script.js';
import { extractJobDetail as orangeDetail } from '../scraper/orangebusiness/script.js';
import { extractJobDetail as lowesDetail } from '../scraper/lowesindia/script.js';

const folder=new URL('../../artifacts/classification-analysis-2026-10-29/',import.meta.url);
const matches=JSON.parse(fs.readFileSync(new URL('skipped-historical-title-matches.json',folder)));
const fetchText=async (url)=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html,application/json'}});
  if(!response.ok)throw new Error('HTTP_'+response.status);
  return response.text();
};
const results=[];
const choices=[];
for(const [source,extractor] of [['orangebusiness',orangeDetail],['lowesindia',lowesDetail]]){
  for(const row of matches.filter(row=>row.source===source && row.candidates.length===1).slice(0,3))choices.push({source,extractor,row});
}
await Promise.all(choices.map(async ({source,extractor,row})=>{
 const job=row.candidates[0];
 const result={source,classificationId:row.id,title:row.title,url:job.sourceUrl,historicalDescriptionChars:job.jobDescription?.length||0,checkedAt:new Date().toISOString()};
 try{
  const html=await fetchText(job.sourceUrl);
  fs.writeFileSync(new URL('probe-'+row.id+'.html',folder),html);
  const detail=extractor(html,job);
  result.extractedDescriptionChars=detail.jobDescription?.length||0;
  result.extractedDescriptionExcerpt=detail.jobDescription?.slice(0,450)||null;
  result.responseChars=html.length;
  result.status='fetched';
 }catch(error){result.status='unavailable';result.errorType=error.name;result.errorCode=/^HTTP_\d+$/.test(error.message)?error.message:error.cause?.code||null;}
 results.push(result);console.log(JSON.stringify(result));
}));
try{
 const jobs=await runDetroit({fetchText,fetchJson:async(url,options={})=>{
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw new Error('HTTP_'+response.status);
  return response.json();
 }});
 fs.writeFileSync(new URL('detroit-live-readonly-jobs.json',folder),JSON.stringify(jobs,null,2));
 results.push({source:'detroitengineeredproducts',status:'extracted',jobs:jobs.length,described:jobs.filter(job=>job.jobDescription?.trim()).length});
 console.log(JSON.stringify(results.at(-1)));
}catch(error){results.push({source:'detroitengineeredproducts',status:'unavailable',errorType:error.name,errorCode:/^HTTP_\d+$/.test(error.message)?error.message:error.cause?.code||null});console.log(JSON.stringify(results.at(-1)));}
fs.writeFileSync(new URL('source-probe-results.json',folder),JSON.stringify(results,null,2));
