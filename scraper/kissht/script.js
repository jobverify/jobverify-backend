import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeInventoryEvidence, attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { activeDocument, requireProof, readListings, roleUrl, publicationDate, readDetail } from './parser.js'
import {readEmployerBranches,resolveWorkBranch,FINANCING_PARTNERS_URL,BRANCHES_URL} from './branches.js'
import { nativeCountryName } from '../../scraper-support/shared/nativeJobPosting.js'
import { activeHead } from '../../scraper-support/utils/activeNativeHtml.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kissht'
export const COMPANY = 'Kissht'
export const OFFICIAL_CAREERS_URL = 'https://www.kissht.com/career'
export const OFFICIAL_ATS_URL = 'https://app1596.workline.hr/Cportal/GeneralOpening.aspx'
export const LISTING_URL = 'https://app1596.workline.hr/CPortal/generalopening.aspx/GetCurrentopening'

export const createKisshtScraper = () => ({
  async run({ fetchImpl = globalThis.fetch, timeoutMs = 240000, signal } = {}) {
    let pagesFetched = 0
    let surface = OFFICIAL_CAREERS_URL
    const controller = new AbortController()
    const gap = (reason, cause) => Object.assign(new Error(`Kissht coverage gap: ${reason}`, { cause }), {
      code: 'KISSHT_COVERAGE_GAP', sourceListingComplete: false,
      inventoryEvidence: normalizeInventoryEvidence({
        status: 'coverage-gap', surface, firstParty: false, listingComplete: false,
        pagesFetched, reportedTotal: null, indiaFacetCount: null,
        verifiedAt: new Date().toISOString(), reason,
      }),
    })
    signal?.throwIfAborted()
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300000) throw gap('Invalid aggregate timeout')
    let timer
    let onAbort
    const cancelled = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(gap('Aggregate timeout checking official careers and Workline'))
      }, timeoutMs)
      onAbort = () => {
        controller.abort(signal.reason)
        reject(signal.reason)
      }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
    try {
      return await Promise.race([cancelled, (async () => {
        const read = async (url, options = {}) => {
          if (controller.signal.aborted) throw gap('Request cancelled')
          surface = url
          const response = await fetchImpl(url, {
            ...options, signal: controller.signal, redirect: 'manual', headers: { accept: 'text/html', ...options.headers },
          })
          if (controller.signal.aborted) throw gap('Request cancelled')
          pagesFetched++
          if (response?.status !== 200) throw gap(`Official surface HTTP ${response?.status ?? 'unknown'}`)
          if (response.url !== url) throw gap('Unverified redirect or employer identity')
          const body = await response.text()
          if (controller.signal.aborted) throw gap('Request cancelled')
          if (typeof body !== 'string' || !body.trim()) throw gap('Official surface body unavailable')
          return body
        }
        const official=activeDocument(await read(OFFICIAL_CAREERS_URL))
        requireProof(official.nodes(n=>n.tag==='a'&&n.attrs.href===OFFICIAL_ATS_URL).length>0,'official Workline handoff changed')
        const board=await read(OFFICIAL_ATS_URL)
        requireProof(activeHead(board).titles.join()==='Kissht - Workline - Possibilities Infinite','Workline board identity changed')
        const {rows,facets}=readListings(JSON.parse(await read(LISTING_URL,{
          method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},
          body:JSON.stringify({JDFileName:'',OrgCode:'',KeyName:''}),
        })))
        const branches=readEmployerBranches(await read(FINANCING_PARTNERS_URL),await read(BRANCHES_URL))
        const jobs=[]
        let cursor=0, fatal=null, unknownCountry=0
        const selected=rows.filter(row=>{
          const branch=resolveWorkBranch(row,branches),country=branch?.country
          if(!country)unknownCountry++
          return nativeCountryName(row.Country_Name)==='India'&&country==='India'
        })
        // Four workers stop taking new work as soon as any request fails.
        await Promise.all(Array.from({length:Math.min(4,selected.length)},async()=>{
          while(!fatal&&cursor<selected.length){
            const row=selected[cursor++]
            try{
              const detail=readDetail(await read(roleUrl(row)),row)
              const date=publicationDate(row.PublishDate),branch=resolveWorkBranch(row,branches)
              jobs.push({id:String(row.ERFCode),jobId:String(row.ERFCode),requisitionId:row.Req_No,source:SOURCE,company:COMPANY,
                title:row.Position_Name.trim()+(row.ExternalJobName?' - '+row.ExternalJobName.trim():''),
                country:branch.country,city:branch.city,state:branch.state,location:[branch.city,branch.state,branch.country].filter(Boolean).join(', '),
                fingerprintLocation:[row.LOCATIONNAME,row.State_Name,'India'].filter(Boolean).join(', '),
                nativeComplianceLocation:{city:row.City_Name||null,location:row.LOCATIONNAME,state:row.State_Name,country:row.Country_Name},nativeWorkBranch:branch,
                postedAt:date,postingDate:date,nativePublicationDate:date,nativePublicationField:date?'PublishDate':null,
                sourceUrl:roleUrl(row),applyUrl:detail.applyUrl,link:detail.applyUrl,
                sourceDescription:detail.description,jobDescription:detail.description,
                sourceDetailComplete:Boolean(detail.description),sourceDetailStatus:detail.description?'complete':'missing-description',
                sourceListingComplete:false,sourceScopeComplete:false,lifecycleCleanupAllowed:false,
                nativeLegalEmployer:row.Business_Name,nativeListingRecord:row,nativeListingFacets:facets,
                nativeSecondaryLocation:row.CustomName1||null,firstEverPublication:null})
            }catch(error){fatal=error;controller.abort(error);throw error}
          }
        }))
        jobs.sort((a,b)=>rows.findIndex(r=>String(r.ERFCode)===a.id)-rows.findIndex(r=>String(r.ERFCode)===b.id))
        return attachInventoryEvidence(jobs,{status:'discovery-only',surface:LISTING_URL,firstParty:true,
          listingComplete:false,pagesFetched,reportedTotal:rows.length,indiaFacetCount:unknownCountry?null:selected.length,
          verifiedAt:new Date().toISOString(),reason:`Native client inventory observed ${rows.length} records; ${selected.length} exact legal-employer work branches have explicit India postal-country evidence, ${unknownCountry} branch-country mappings remain unknown. Compliance address never substitutes for workplace; scope incomplete and cleanup disabled.`})
      })()])
    } catch (error) {
      controller.abort()
      if (signal?.aborted) throw signal.reason
      if (error?.code === 'KISSHT_COVERAGE_GAP') throw error
      throw gap('Official careers transport/body unavailable', error)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  },
})

export const run = async (options = {}) => createKisshtScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/kissht/script.js')

if (isDirectExecution) {
  const jobs = await run()
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
