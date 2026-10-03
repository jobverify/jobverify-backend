import { CANONICAL_CITIES } from '../../scraper-support/utils/cities.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

export const PUBLIC_API_BASE = 'https://walkaroo.zappyhire-multitenant-be-prod.zappyhire.com/api/'
const INDIA_STATES = /\b(?:Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttarakhand|Uttar Pradesh|West Bengal|Delhi|Puducherry|Chandigarh)\b/i
const clean = value => String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\\[nrt]/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;|&#038;/gi, '&').replace(/&#39;|&#x27;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim()
const payloadResult = (payload, label) => {
  if (payload?.status !== 1 || payload.errors || !payload.results) throw new Error('Walkaroo public '+label+' API is unsuccessful or malformed')
  return payload.results
}
const scopedLocation = record => {
  const city = clean(record?.city)
  const code = String(record?.country_code || '').toUpperCase()
  if (!city) return { unresolved: true }
  if (code && !['IN', 'IND', 'INDIA'].includes(code)) return { foreign: true }
  const first = city.split(/[-,]/)[0].trim()
  const cityKey = first.toLowerCase()
  const canonicalCity = Object.hasOwn(CANONICAL_CITIES, cityKey) && typeof CANONICAL_CITIES[cityKey] === 'string'
    ? CANONICAL_CITIES[cityKey] : null
  if (['IN','IND','INDIA'].includes(code) || /\bIndia\b/i.test(city) || INDIA_STATES.test(city) || (canonicalCity && !['None', 'Remote'].includes(canonicalCity))) {
    return {city:canonicalCity || first,location:city+', India'}
  }
  return {unresolved:true}
}

export const runWalkarooPublicCareers = async ({shell,fetchText,fetchJson,pageSize=50,maxPages=100,now=()=>new Date().toISOString()}) => {
  if (!Number.isInteger(pageSize) || pageSize <= 0 || !Number.isInteger(maxPages) || maxPages <= 0) throw new Error('Walkaroo pagination limits must be positive integers')
  const clientPath = String(shell).match(/<script\b[^>]*src=["'](main\.[\w-]+\.js)["']/i)?.[1]
  if (!clientPath) throw new Error('Walkaroo verified public careers client is missing')
  const client = await fetchText(new URL(clientPath,'https://recruitcareers.zappyhire.com/en/').href)
  if (!client.includes('zappyhire-multitenant-be-prod.zappyhire.com/') || !client.includes('api/careers/configurations/') || !client.includes('api/jobs/jobsearch/') || !client.includes('api/careers/jobs/')) {
    throw new Error('Walkaroo verified public careers client changed materially')
  }
  const config = payloadResult(await fetchJson(PUBLIC_API_BASE+'careers/configurations/'),'configuration')
  if (config.name !== 'Walkaroo International' || config.website !== 'https://www.walkaroo.in/' || config.career_text_heading !== 'Walkaroo International Careers') throw new Error('Walkaroo public careers tenant identity changed')
  const listings = []
  const seen = new Set()
  let total = null
  let pagesFetched = 0
  for (let page=1;page<=maxPages;page+=1) {
    const results = payloadResult(await fetchJson(PUBLIC_API_BASE+'jobs/jobsearch/?page='+page+'&page_size='+pageSize),'job search')
    if (!Number.isInteger(results.total?.value) || results.total.value<0 || results.total.relation!=='eq' || !Array.isArray(results.hits)) throw new Error('Walkaroo public jobs pagination schema changed')
    if (total !== null && total !== results.total.value) throw new Error('Walkaroo public jobs total changed during pagination')
    total = results.total.value
    pagesFetched += 1
    for (const hit of results.hits) {
      const row = hit?._source
      if (row?.client!=='walkaroo' || !Number.isInteger(row.job) || row.job<=0 || !clean(row.title) || !clean(row.location) || seen.has(row.job)) throw new Error('Walkaroo public jobs inventory identity or duplicate IDs changed')
      seen.add(row.job)
      listings.push(row)
    }
    if (listings.length>total) throw new Error('Walkaroo incomplete public jobs pagination: more jobs than reported total')
    if (listings.length===total) break
    if (!results.hits.length || page===maxPages) throw new Error('Walkaroo incomplete public jobs pagination')
  }
  const jobs = []
  let unresolved = false
  for (const row of listings) {
    const detail = payloadResult(await fetchJson(PUBLIC_API_BASE+'careers/jobs/'+row.job+'/'),'job detail')
    if (detail.id !== row.job || clean(detail.title)!==clean(row.title) || !Array.isArray(detail.location) || !detail.location.length || !clean(detail.description)) throw new Error('Walkaroo public job detail identity or content changed')
    const scopes = detail.location.map(scopedLocation)
    if (scopes.some(scope=>scope.unresolved)) unresolved = true
    const india = scopes.filter(scope=>scope.location)
    if (!india.length) continue
    const apply = detail.job_board_urls?.find(board=>board.feature?.name==='career_page')?.url
    let applyUrl
    try { applyUrl=new URL(apply) } catch { throw new Error('Walkaroo public application handoff is missing') }
    if (applyUrl.protocol!=='https:' || applyUrl.hostname!=='recruitcareers.zappyhire.com' || !/^\/(?:en\/)?walkaroo\/apply$/.test(applyUrl.pathname) || applyUrl.searchParams.get('job')!==String(row.job)) throw new Error('Walkaroo public application handoff changed')
    jobs.push({title:clean(detail.title),company:'Walkaroo',source:'walkaroo',jobId:String(row.job),requisitionId:String(row.job),
      location:india.map(scope=>scope.location).join('; '),city:india[0].city,country:'India',department:clean(detail.department||row.department)||null,
      employmentType:clean(detail.job_type||row.job_type)||null,experienceRequired:detail.experience==null?null:String(detail.experience)+(detail.max_experience!=null?' - '+detail.max_experience:''),
      jobDescription:clean(detail.description),requiredSkills:Array.isArray(detail.skills)?detail.skills.map(clean).filter(Boolean):[],
      postingDate:detail.job_publish_date||null,sourceUrl:applyUrl.href,applyUrl:applyUrl.href,link:applyUrl.href,
      companyCareerPage:'https://recruitcareers.zappyhire.com/en/walkaroo',companyDomain:'walkaroo.in',atsPlatform:'zappyhire',scrapedAt:now()})
  }
  if (unresolved && !jobs.length) throw new Error('Walkaroo incomplete country scope: public role geography is unverified')
  if (unresolved) for (const job of jobs) job.sourceListingComplete=false
  return attachInventoryEvidence(jobs,{status:total===0?'verified-empty':'complete-inventory',surface:PUBLIC_API_BASE+'jobs/jobsearch/',firstParty:true,listingComplete:!unresolved,pagesFetched,reportedTotal:total,indiaFacetCount:unresolved?null:jobs.length,verifiedAt:now(),reason:'Verified official Walkaroo handoff, tenant configuration and complete paginated public jobs inventory.'})
}
