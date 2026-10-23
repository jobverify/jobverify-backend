import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFirstPartyHTMLScraper, createHTMLTransport } from '../../scraper-support/shared/firstPartyHtmlJobs.js'
import { nativePostingJobs } from '../../scraper-support/shared/nativeJobPosting.js'
import { createSourceConfig, HOME } from './parser.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "decathlon"
export const COMPANY = "Decathlon"
export const CAREERS_URL = HOME
export const DISPOSITION = "official-digitalrecruiters-public-api"
export const VERIFIED_ON = "2026-10-23"
export const VERIFIED_SURFACE_SUMMARY = "Official Decathlon India careers tenant with complete native pagination, role descriptions/profile, typed India addresses and original JobPosting dates; whole-employer scope and production visibility remain unverified."

export const run = (options = {}) => {
  const config = createSourceConfig(options)
  const fetchImpl = options.fetchImpl || globalThis.fetch
  // The common collector reads resource URLs; the advertised search resource
  // uses a read-only POST. Preserve its physical method/body in transport proof.
  const raw = options.transport || createHTMLTransport(config, { ...options,
    fetchImpl: (url, request) => fetchImpl(url, { ...request, ...config.readRequest(url) }),
  })
  const transport = async (url, request) => {
    const nativeRequest = config.readRequest(url)
    const packet = await raw(url, { ...request, ...nativeRequest })
    if (!packet || typeof packet !== 'object') return packet
    return { ...packet, provenance: { ...packet.provenance, nativeReadRequest: {
      method: nativeRequest.method, body: nativeRequest.body ?? null,
      purpose: nativeRequest.method === 'POST' ? 'anonymous read-only public vacancy search' : 'anonymous public read',
    } } }
  }
  config.projectJobs = result => nativePostingJobs(result, config).map(job => ({ ...job,
    applyUrl: job.sourceUrl, link: job.sourceUrl, applicationLinkSource: 'public-role-page-fallback',
    jobDescription: job.nativeFacts.nativeDescriptionHTML, sourceDescription: job.nativeFacts.nativeDescriptionHTML,
    nativeDescriptionOrigin: job.nativeFacts.nativeDescriptionOrigin,
    nativeDatePosted: job.nativeFacts.nativePostedDate.raw, nativeRepublishedAt: job.nativeFacts.nativeRepublishedAt,
    nativeJobAdID: job.nativeFacts.nativeJobAdID, nativeAddressID: job.nativeFacts.nativeAddressID,
    city: job.city || null,
    state: job.nativeCountryAddresses[0].raw.addressRegion || null,
    employmentType: job.nativeFacts.nativeAPIRecord.working_time || null,
    minimumQualification: job.nativeFacts.nativeAPIRecord.education_level || null,
  }))
  return createFirstPartyHTMLScraper(config).run({ ...options, transport })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
