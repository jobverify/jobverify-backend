import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../myworkday/engine.js'

export const CAREER_PAGE_URL = 'https://www.genpact.com/careers'
export const BASE_URL = 'https://genpact.wd108.myworkdayjobs.com/External_Careers'
export const COMPANY_NAME = 'Genpact'
export const SOURCE = 'genpact'
export const INDIA_LOCATION_COUNTRY = 'c4f78be1a8f14da0ab49ce1162348a5e'

const scraperDir = path.dirname(fileURLToPath(import.meta.url))

export const buildScraperOptions = () => ({
  company: COMPANY_NAME,
  baseUrl: BASE_URL,
  locationCountry: INDIA_LOCATION_COUNTRY,
  source: SOURCE,
  scraperDir,
})

export const createGenpactScraper = ({
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
  createGenpactScraper({ workdayRunner }).run({ signal })
