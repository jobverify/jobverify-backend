/** Conservative recovery from a role page's employer-authored JobPosting schema. */
const identity=value=>String(value??'').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim().toLowerCase();
const sameUrl=(a,b)=>{try{const x=new URL(a),y=new URL(b);return x.protocol==='https:'&&y.protocol==='https:'&&x.origin===y.origin&&x.pathname.replace(/\/$/,'')===y.pathname.replace(/\/$/,'')&&x.search===y.search;}catch{return false;}};
export function publicPostingDescription(job,html,responseUrl) {
  const url=job.sourceUrl||job.applyUrl||job.link;
  if(!sameUrl(url,responseUrl)||!identity(job.title)||!identity(job.company))return null;
  const records=[];
  const visit=(value,depth=0)=>{
    if(!value||depth>8)return;
    if(Array.isArray(value)){for(const item of value)visit(item,depth+1);return;}
    if(typeof value!=='object')return;
    const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
    if(types.includes('JobPosting'))records.push(value);
    if(value['@graph'])visit(value['@graph'],depth+1);
  };
  for(const match of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{visit(JSON.parse(match[1]));}catch{return null;}
  }
  const matches=records.filter(value=>identity(value.title)===identity(job.title)&&identity(value.hiringOrganization?.name)===identity(job.company)&&sameUrl(value.url,url));
  if(matches.length!==1)return null;
  const value=matches[0],id=value.identifier?.value??(typeof value.identifier==='string'?value.identifier:null),expectedId=job.jobId||job.requisitionId;
  if(id&&expectedId&&String(id)!==String(expectedId))return null;
  if(typeof value.description!=='string'||!value.description.trim())return null;
  return {description:value.description,evidence:{method:'exact_role_jobposting_schema',url:responseUrl,title:value.title,employer:value.hiringOrganization.name,jobId:id||null}};
}
