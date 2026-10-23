import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {createHash} from 'node:crypto'
import {document} from '../../scraper-support/shared/rmkNativePairHtml.js'
import {normalizeInventoryEvidence,attachInventoryEvidence,readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import candidate from './catalog-candidate.json' with {type:'json'}

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'parkpluscompany'
export const COMPANY = 'Park Plus'
export const FIRST_PARTY_ROOT_URL = 'https://parkplus.io/careers'
export const FIRST_PARTY_CAREERS_URL = FIRST_PARTY_ROOT_URL

export const PROVIDER_METADATA = {...candidate,modulePath:fileURLToPath(import.meta.url)}
export const createParkPlusCompanyScraper = (defaults = {}) => ({
  async run(options = {}) {
    const {fetchImpl = globalThis.fetch, signal, timeoutMs = 30000, now = () => new Date().toISOString()} = {...defaults, ...options}
    const timestamp=()=>new Date(typeof now==='function'?now():now).toISOString()
    signal?.throwIfAborted()
    const controller = new AbortController(), retainedResponses = []
    let firstParty = false, surface = FIRST_PARTY_ROOT_URL, timer, abortListener, callerListener
    const gap = (reason, cause) => Object.assign(new Error('Park Plus coverage gap: ' + reason, {cause}), {
      code:'PARKPLUSCOMPANY_COVERAGE_GAP',source:SOURCE,partial:true,abortRetries:true,
      sourceListingComplete:false,sourceScopeComplete:false,lifecycleCleanupAllowed:false,retainedResponses,
      inventoryEvidence:normalizeInventoryEvidence({status:'coverage-gap',surface,firstParty,listingComplete:false,
        pagesFetched:retainedResponses.length,reportedTotal:null,indiaFacetCount:null,verifiedAt:timestamp(),reason}),
    })
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw gap('Invalid aggregate request budget')
    const interrupted = new Promise((_, reject) => {
      abortListener = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort',abortListener,{once:true})
      callerListener = () => controller.abort(signal.reason)
      signal?.addEventListener('abort',callerListener,{once:true})
      timer = setTimeout(() => controller.abort(gap('Aggregate native fetch/body deadline exceeded')),timeoutMs)
    })
    const collect = async () => {
      const read = async url => {
        controller.signal.throwIfAborted(); surface = url
        const response = await fetchImpl(url,{signal:controller.signal,redirect:'manual',headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}})
        if(controller.signal.aborted) void Promise.resolve(response.body?.cancel?.(controller.signal.reason)).catch(()=>{})
        controller.signal.throwIfAborted()
        if(response.url !== url || response.status!==200) {void Promise.resolve(response.body?.cancel?.()).catch(()=>{});throw gap('Native final URL or HTTP status changed')}
        let body
        if(response.body?.getReader) {
          const reader = response.body.getReader(), chunks = []; let bytes = 0
          const cancel = () => {void Promise.resolve(reader.cancel(controller.signal.reason)).catch(()=>{})}
          controller.signal.addEventListener('abort',cancel,{once:true})
          try {
            while(true) {
              controller.signal.throwIfAborted()
              const part = await reader.read(); controller.signal.throwIfAborted()
              if(part.done) break
              bytes += part.value.byteLength
              if(bytes > 3000000) {cancel();throw gap('Native streamed body exceeds byte limit')}
              chunks.push(Buffer.from(part.value))
            }
            body = Buffer.concat(chunks).toString('utf8')
          } finally {controller.signal.removeEventListener('abort',cancel);reader.releaseLock?.()}
        } else body = await response.text()
        controller.signal.throwIfAborted()
        if(typeof body !== 'string' || Buffer.byteLength(body)>3000000) throw gap('Native body absent or oversized')
        retainedResponses.push({url,finalUrl:response.url,status:response.status,body,capturedAt:timestamp(),bodySHA256:createHash('sha256').update(body).digest('hex')})
        if(response.status!==200 || !body.trim()) throw gap('Native HTTP failure or empty body')
        const doc = document(body)
        const prune = (node, inherited = false) => {
          node.inactive ||= inherited || /(?:^|;)\s*content-visibility\s*:\s*hidden\s*(?:!important\s*)?(?:;|$)/i.test((node.attrs?.style || '').replace(/\/\*[\s\S]*?\*\//g,''))
          for(const child of node.children.filter(value=>typeof value!=='string')) prune(child,node.inactive)
        }
        prune(doc.root)
        for(const node of doc.nodes(n=>n.tag==='script'&&n.attrs.type==='application/ld+json')) {
          let schema;try{schema=JSON.parse(node.raw)}catch{throw gap('Native structured contract invalid')}
          const hasPosting=value=>value&&typeof value==='object'&&(value['@type']==='JobPosting'||Array.isArray(value['@type'])&&value['@type'].includes('JobPosting')||Object.values(value).some(hasPosting))
          if(hasPosting(schema))throw gap('New structured vacancy requires country, date, expiry and active application review')
        }
        if(doc.nodes(n=> /(?:^|\s)(?:addressCountry|datePosted|validThrough|jobLocation|hiringOrganization)(?:\s|$)/i.test(n.attrs.itemprop||'' ) || /JobPosting/i.test(n.attrs.itemtype||'')).length)
          throw gap('New job country, publication, expiry or identity microdata requires native review')
        return doc
      }
      const doc=await read(FIRST_PARTY_ROOT_URL)
      const identities=doc.nodes(n=>n.tag==='script'&&n.attrs.type==='application/ld+json').map(n=>JSON.parse(n.raw)).filter(v=>v['@type']==='Organization')
      const names=identities.map(v=>v.name)
      throw gap(names.length===1&&names[0]==='Park+'
        ? 'Configured official surface identifies Park+, while this distinct literal catalogue entry is Park Plus; exact entity relationship is unproven. Do not substitute Park+ vacancies.'
        : 'Configured employer identity changed; reviewed exact Park Plus entity and recruiting surface are required')

    }
    try {return await Promise.race([collect(),interrupted])}
    catch(error) {if(signal?.aborted) throw signal.reason;if(error?.code==='PARKPLUSCOMPANY_COVERAGE_GAP') throw error;throw gap('Native recruiting transport or contract unavailable',error)}
    finally {clearTimeout(timer);signal?.removeEventListener('abort',callerListener);controller.signal.removeEventListener('abort',abortListener);controller.abort()}
  },
})

export const run = async (options = {}) => createParkPlusCompanyScraper(options).run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/parkpluscompany/script.js')

if (isDirectExecution) {
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()
  if(readInventoryEvidence(jobs)?.listingComplete!==true){console.error(readInventoryEvidence(jobs)?.reason);process.exitCode=1}
  else {const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js');if(isDryRun)saveToFile(jobs,path.join(currentDir,'jobs.json'));else await saveToDB(jobs,SOURCE)}
}
