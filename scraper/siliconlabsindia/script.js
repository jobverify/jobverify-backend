import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../myworkday/engine.js'

export const CAREER_PAGE_URL = 'https://www.silabs.com/about-us/careers'
export const BASE_URL = 'https://silabs.wd1.myworkdayjobs.com/SiliconlabsCareers'
export const COMPANY_NAME = 'Silicon Labs India'
export const SOURCE = 'siliconlabsindia'
export const INDIA_LOCATION_COUNTRY = 'c4f78be1a8f14da0ab49ce1162348a5e'

const scraperDir = path.dirname(fileURLToPath(import.meta.url))

export const buildScraperOptions = () => ({
  company: COMPANY_NAME,
  baseUrl: BASE_URL,
  locationCountry: INDIA_LOCATION_COUNTRY,
  source: SOURCE,
  scraperDir,
})

export const createSiliconLabsIndiaScraper = ({
  workdayRunner = runWorkdayScraper,
} = {}) => ({
  run: () => workdayRunner(buildScraperOptions()),
})

export const run = async ({ workdayRunner = runWorkdayScraper } = {}) =>
  createSiliconLabsIndiaScraper({ workdayRunner }).run()
