import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createEmployerBoundWorkableScraper } from '../../scraper-support/utils/workableEmployerInventory.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "huggingface"
export const COMPANY = "Hugging Face"
export const CAREERS_URL = 'https://apply.workable.com/huggingface/'
export const DISPOSITION = 'live-parser'
export const VERIFIED_ON = '2026-10-26'
export const VERIFIED_SURFACE_SUMMARY = 'Current Hugging Face homepage careers link and reciprocal Workable account identity bind the native tenant. Runtime reads complete cursor inventory and India descriptions; hidden or unresolved geography retains partial evidence.'

export const createHuggingFaceScraper = (options = {}) => createEmployerBoundWorkableScraper({
  source: SOURCE, company: COMPANY, tenant: 'huggingface',
  accountUid: '940cf17f-c078-40ac-95e8-07704e754048', careersUrl: 'https://huggingface.co/',
  companyDomain: 'huggingface.co',
}, options)
export const run = async (options = {}) => createHuggingFaceScraper(options).run(options)

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
