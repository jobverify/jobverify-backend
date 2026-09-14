import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../../scraper-support/myworkday/engine.js'

export const CAREER_PAGE_URL = 'https://www.genpact.com/careers'
export const INDIA_LOCATION_IDS = Object.freeze([
  'faddece16d451000bf3a693d530e0000',
  'faddece16d451000bf3431453ec10000',
  'faddece16d451000bf3f6b6fd3460000',
  'faddece16d451000bf3a7414fa770000',
  'faddece16d451000bf355dde36f70000',
  'faddece16d451000bf39921bee4a0000',
  'faddece16d451000bf39602074150000',
  'faddece16d451000bf38ec7a7f2e0000',
  'faddece16d451000bf37ad3571790000',
  '03c53440f02d1000c3514fefac9c0000',
  'faddece16d451000bf32ffeb20950000',
  'faddece16d451000bf33e08c2fb50000',
  'faddece16d451000bf3f64d149160000',
  'faddece16d451000bf34a6b79be40000',
  'faddece16d451000bf3be21bae0f0000',
  'faddece16d451000bf3887e2c7e10000',
  'faddece16d451000bf32840a7aae0000',
  'faddece16d451000bf3e0fde5af30000',
  'faddece16d451000bf33c60d6da10000',
  'faddece16d451000bf37890590770000',
  'faddece16d451000bf3c9d4601010000',
  'faddece16d451000bf3c80f8daeb0000',
  'faddece16d451000bf374df10fa90000',
  'faddece16d451000bf3cf52b8c630000',
  'faddece16d451000bf3f05bfd76c0000',
  'faddece16d451000bf35c44819a90000',
  'faddece16d451000bf32ecada1f70000',
  'faddece16d451000bf3d1bb2afcf0000',
  'faddece16d451000bf335d4335830000',
  'faddece16d451000bf4036b599930000',
  'faddece16d451000bf3abce51e850000',
  'faddece16d451000bf3c88cb990f0000',
  'faddece16d451000bf3f280526670000',
  'faddece16d451000bf3654f2ad0c0000',
  'faddece16d451000bf34b35eae2a0000',
  'faddece16d451000bf3339b958200000',
  'faddece16d451000bf324de9696b0000',
  'faddece16d451000bf33b19980d10000',
  '76b02f08dd1310016d6b19dc61be0000',
  'b1404e288dc71000db08962858cc0000',
  'faddece16d451000bf3f686e641b0000',
  'faddece16d451000bf369b6d5a040000',
  'b1404e288dc710016d1fa215ea6c0000',
  'faddece16d451000bf36c0cdf3220000',
  'faddece16d451000bf3baabf8abd0000',
  'faddece16d451000bf3c41c774830000',
  'faddece16d451000bf3d37688ca50000',
  'bd9ea76bd64b1000aeebe6bd05340000',
  'faddece16d451000bf34357c70cf0000',
  'faddece16d451000bf325822da9e0000',
  'faddece16d451000bf35cc1cab040000',
  'faddece16d451000bf370d6760d10000',
  'faddece16d451000bf36e76b83520000',
  'faddece16d451000bf33829b1d660000',
  'faddece16d451000bf36a03eccc70000',
  'faddece16d451000bf34b6fbed230000',
  'faddece16d451000bf366e3decde0000',
  'faddece16d451000bf3213942aad0000',
  'faddece16d451000bf382b1b6ada0000',
  'faddece16d451000bf3c2a51e8520000',
  'faddece16d451000bf3799e932a70000',
  'faddece16d451000bf347bfdf0380000',
  'faddece16d451000bf39e10bae060000',
  'faddece16d451000bf3bf42ad2dd0000',
  'faddece16d451000bc25895401c30000',
  'faddece16d451000bc257f189c3e0000',
  'faddece16d451000bc259994ffbd0000',
])
const indiaLocationQuery = new URLSearchParams(
  INDIA_LOCATION_IDS.map(id => ['locations', id]),
)
export const BASE_URL =
  `https://genpact.wd108.myworkdayjobs.com/External_Careers?${indiaLocationQuery}`
export const COMPANY_NAME = 'Genpact'
export const SOURCE = 'genpact'
export const INDIA_LOCATION_COUNTRY = null

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
