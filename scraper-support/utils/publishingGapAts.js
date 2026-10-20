import { runApiPortalScraper } from '../apiPortal/engine.js'
import { expandApiPortalProviderTemplate } from '../providers/apiPortalTemplates.js'
import { extractAshbyJobs } from './ashbyApi.js'
import { fetchJsonWithRetry } from './fetch.js'
import { filterIndiaJobs } from './indiaLocationFilter.js'
import { attachInventoryEvidence } from './inventoryEvidence.js'

// Generic remote work is not evidence that an employer accepts applicants in India.
const INDIA_LOCATION = /\bindia\b|\bbengaluru\b|\bbangalore\b|\bhyderabad\b|\bpune\b|\bgurugram\b|\bgurgaon\b|\bmumbai\b|\bchennai\b|\bnoida\b|\bdelhi\b|\bahmedabad\b/i
const TALENT_POOL = /talent (community|network|pool)|speculative|future opportunities|general application/i
// apiPortal's country defaults to the provider filter; only source location text proves eligibility.
const indiaLocation = (job) => INDIA_LOCATION.test([job.location, job.city].filter(Boolean).join(' '))
const httpUrl = (value) => { try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false } }

export const createPublishingGapAtsScraper = (provider) => ({
  async run({ fetchJson = (url, options) => fetchJsonWithRetry(url, { ...options, timeoutMs: 20000, label: provider.source }), signal } = {}) {
    const kind = provider.atsPlatform
    if (!['greenhouse', 'ashby', 'lever'].includes(kind)) throw new Error(`Unsupported ATS: ${kind}`)
    const token = encodeURIComponent(provider.boardToken)
    const url = kind === 'greenhouse'
      ? `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`
      : kind === 'ashby'
        ? `https://api.ashbyhq.com/posting-api/job-board/${token}`
        : `https://api.lever.co/v0/postings/${token}?mode=json`
    const payload = await fetchJson(url, { signal })
    const records = kind === 'lever' ? payload : payload?.jobs
    if (!Array.isArray(records)) throw new Error(`[${provider.source}] Invalid ${kind} inventory`)
    const reported = payload?.meta?.total ?? payload?.total ?? null
    if (payload?.hasMore === true || (reported != null && Number(reported) !== records.length)) {
      throw new Error(`[${provider.source}] Incomplete ${kind} inventory`)
    }
    const active = records.filter((record) => record?.isListed !== false)
    if (active.some((record) => !record?.id || !(record.title || record.text))) {
      throw new Error(`[${provider.source}] Malformed ${kind} inventory record`)
    }
    if (active.some((record) => !httpUrl(kind === 'greenhouse' ? record.absolute_url : record.applyUrl))) {
      throw new Error(`[${provider.source}] Invalid ${kind} application URL`)
    }
    let mapped
    if (kind === 'ashby') {
      mapped = extractAshbyJobs({ payload, companyName: provider.companyName })
    } else {
      const config = expandApiPortalProviderTemplate({ ...provider, template: kind, templateOptions: { boardToken: provider.boardToken } })
      // Greenhouse updated_at is an edit timestamp, not the original posting date.
      if (kind === 'greenhouse') config.config.mapping.postingDate = 'first_published'
      const prepared = kind === 'lever'
        ? records.map((record) => ({ ...record, descriptionBodyPlain: [record.descriptionPlain || record.description, ...(record.lists || []).map((section) => `${section.text || ''}\n${section.content || ''}`), record.additionalPlain || record.additional].filter(Boolean).join('\n\n') || null }))
        : payload
      mapped = await runApiPortalScraper({ provider: config, fetchJson: async () => prepared })
    }
    const located = filterIndiaJobs(mapped).filter(indiaLocation)
    const jobs = located.filter((job) => !TALENT_POOL.test(job.title)).map((job) => ({
      ...job,
      source: provider.source,
      company: provider.companyName,
      link: job.applyUrl,
      postingDate: job.postingDate || null,
      scrapedAt: new Date().toISOString(),
    }))
    return attachInventoryEvidence(jobs, {
      status: records.length === 0 ? 'verified-empty' : 'complete-inventory',
      surface: url,
      firstParty: true,
      listingComplete: true,
      pagesFetched: 1,
      reportedTotal: records.length,
      indiaFacetCount: located.length,
      verifiedAt: new Date().toISOString(),
      reason: `${kind}-public-posting-api-complete-single-response`,
    })
  },
})
