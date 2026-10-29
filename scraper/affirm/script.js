import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPublishingGapAtsScraper } from '../../scraper-support/utils/publishingGapAts.js'
import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "affirm"
export const COMPANY = "Affirm"
export const CAREERS_URL = 'https://www.affirm.com/careers'
export const JOBS_API = 'https://boards-api.greenhouse.io/v1/boards/affirm/jobs?content=true'

export const run = async ({ fetchJson = (url, options) => fetchJsonWithRetry(url, { ...options, timeoutMs: 25000, label: SOURCE }), signal } = {}) => {
  signal?.throwIfAborted()
  const payload = await fetchJson(JOBS_API, { signal })
  signal?.throwIfAborted()
  if (!Array.isArray(payload?.jobs) || !Number.isSafeInteger(payload.meta?.total)
    || payload.meta.total !== payload.jobs.length) throw new Error('Affirm complete native inventory unavailable')
  const identities = new Set()
  for (const job of payload.jobs) {
    let url
    try { url = new URL(job.absolute_url) } catch { throw new Error('Affirm native role URL is malformed') }
    const location = typeof job.location?.name === 'string' ? job.location.name : ''
    // Match each complete scope, rather than treating one familiar country word
    // as proof that every location on a posting has been resolved.
    const india = /^(?:Remote India|(?:[A-Za-z][A-Za-z .'-]*,\s*)?India)$/i.test(location)
    const assignedUKOffice = location === 'London' && Array.isArray(job.offices) && job.offices.length > 0
      && job.offices.every(office => office?.name === 'Remote UK')
    const foreign = assignedUKOffice || /^(?:Remote (?:US|UK|Canada|Poland|Spain)|(?:New York, New York, United States|San Francisco, California, United States)(?:;\s*(?:New York, New York, United States|San Francisco, California, United States))*)$/i.test(location)
    if (!Number.isSafeInteger(job.id) || job.id <= 0 || identities.has(job.id)
      || job.company_name !== COMPANY || url.origin !== 'https://job-boards.greenhouse.io' || url.username || url.password
      || url.search || url.hash || url.pathname !== `/affirm/jobs/${job.id}` || (!india && !foreign)) {
      throw new Error('Affirm native employer, board or country scope is unresolved')
    }
    identities.add(job.id)
  }
  const jobs = await createPublishingGapAtsScraper({ source: SOURCE, companyName: COMPANY, atsPlatform: 'greenhouse', boardToken: 'affirm' }).run({ fetchJson: async () => payload, signal })
  signal?.throwIfAborted()
  return jobs
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
