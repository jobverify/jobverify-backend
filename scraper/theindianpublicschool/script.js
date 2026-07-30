import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../myworkday/engine.js'

export const CAREER_PAGE_URL = 'https://www.theindianpublicschool.org/careers'
export const BASE_URL = 'https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers?q=TIPS&jobFamilyGroup=2d491c2214bf1000c1f6c9eeac980001&CF_LRV_Job_Category__From_Job_Profile__Extended=2d491c2214bf1000c1f6c9eeac980001'
export const COMPANY_NAME = 'The Indian Public School (TIPS)'
export const SOURCE = 'theindianpublicschool'
export const INDIA_LOCATION_COUNTRY = 'c4f78be1a8f14da0ab49ce1162348a5e'

const scraperDir = path.dirname(fileURLToPath(import.meta.url))

export const buildScraperOptions = () => ({
  company: COMPANY_NAME,
  baseUrl: BASE_URL,
  locationCountry: INDIA_LOCATION_COUNTRY,
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
