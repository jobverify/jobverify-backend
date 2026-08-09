import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { run as runGeAerospace } from '../geaerospace/script.js'
import { run as runGeHealthCare } from '../gehealthcare/script.js'
import { run as runGeVernova } from '../gevernova/script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GE_CAREERS_HUB_URL = 'https://www.ge.com/faq'
export const GE_SUBSIDIARY_SOURCES = ['geaerospace', 'gevernova', 'gehealthcare']

const flattenJobs = (jobLists) => jobLists.flatMap((jobs) => jobs)

export const createGeneralElectricScraper = ({
  geAerospaceRun = runGeAerospace,
  geVernovaRun = runGeVernova,
  geHealthCareRun = runGeHealthCare,
} = {}) => ({
  async run(options = {}) {
    const [aerospaceJobs, vernovaJobs, healthcareJobs] = await Promise.all([
      geAerospaceRun(options),
      geVernovaRun(options),
      geHealthCareRun(options),
    ])

    const jobs = flattenJobs([aerospaceJobs, vernovaJobs, healthcareJobs])
    const { maxJobs } = options
    return Number.isInteger(maxJobs) && maxJobs >= 0 ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createGeneralElectricScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running General Electric scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'generalelectric')
    console.log('DB result:', result)
    process.exit(0)
  }
}
