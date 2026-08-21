import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../../scraper-support/myworkday/engine.js'

export const CAREER_PAGE_URL = 'https://www.theindianpublicschool.org/careers'
export const BASE_URL = 'https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers'
export const COMPANY_NAME = 'The Indian Public School (TIPS)'
export const SOURCE = 'theindianpublicschool'

const scraperDir = path.dirname(fileURLToPath(import.meta.url))

export const buildScraperOptions = () => ({
  company: COMPANY_NAME,
  baseUrl: BASE_URL,
  locationCountry: null,
  source: SOURCE,
  scraperDir,
})

export const createTheIndianPublicSchoolScraper = ({
  workdayRunner = runWorkdayScraper,
} = {}) => ({
  run: ({ signal } = {}) => workdayRunner({
    ...buildScraperOptions(),
    ...(signal === undefined ? {} : { signal }),
  }),
})

export const run = async ({
  workdayRunner = runWorkdayScraper,
  signal,
} = {}) =>
  createTheIndianPublicSchoolScraper({ workdayRunner }).run({ signal })
