import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFirstPartyHTMLScraper, createHTMLTransport } from '../../scraper-support/shared/firstPartyHtmlJobs.js'
import { nativePostingJobs } from '../../scraper-support/shared/nativeJobPosting.js'
import { createSourceConfig, HOME } from './parser.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "accor"
export const COMPANY = "Accor"
export const CAREERS_URL = HOME
export const DISPOSITION = "official-SmartRecruiters-India-native"
export const VERIFIED_ON = "2026-10-23"
export const VERIFIED_SURFACE_SUMMARY = "Official Accor corporate/careers/role links bind the AccorHotel public India API. Complete native pagination,full employer sections,typed countries,IDs and native release dates retained. Brand inventory,whole-employer/legal scope and production remain distinct;cleanup forbidden."

export const run = (options = {}) => {
  const config = createSourceConfig(options), stop = new AbortController()
  const signal = options.signal ? AbortSignal.any([options.signal, stop.signal]) : stop.signal
  const raw = options.transport || createHTMLTransport(config, { ...options, signal })
  const transport = async (url, request) => {
    const packet = await raw(url, request)
    if ([401, 403, 429].includes(packet?.status)) stop.abort(Object.assign(Error('Accor public upstream access/rate limit;no further requests'), { code: 'NATIVE_PUBLIC_READ_STOPPED' }))
    return packet
  }
  config.projectJobs = result => nativePostingJobs(result, config).map(job => ({ ...job,
    requisitionId: job.nativeFacts.sourceRequisitionID, nativeJobAdID: job.nativeFacts.nativeJobAdID,
    nativeRequisitionUUID: job.nativeFacts.nativeRequisitionUUID, nativePostingUUID: job.nativeFacts.nativePostingUUID,
    jobDescription: job.nativeFacts.nativeDescriptionHTML, sourceDescription: job.nativeFacts.nativeDescriptionHTML,
    nativeDescriptionOrigin: job.nativeFacts.nativeDescriptionOrigin,
    city: job.nativeFacts.nativeAPIRecord.location.city, state: null,
    nativeRegionCode: job.nativeFacts.nativeAPIRecord.location.region ?? null,
    location: job.nativeFacts.nativeAPIRecord.location.fullLocation,
    employmentType: job.nativeFacts.nativeAPIRecord.typeOfEmployment?.label ?? null,
    experienceLevel: job.nativeFacts.nativeAPIRecord.experienceLevel?.label ?? null,
    minimumQualification: job.nativeFacts.minimumQualification,
    preferredQualification: job.nativeFacts.preferredQualification,
    remoteStatus: job.nativeFacts.nativeAPIRecord.location.remote === true ? 'Remote' : null,
  }))
  return createFirstPartyHTMLScraper(config).run({ ...options, signal, transport })
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
