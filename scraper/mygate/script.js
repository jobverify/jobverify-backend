import { createDarwinboxScraper } from '../darwinbox/script.js'

export const COMPANY_NAME = 'MyGate'
export const SOURCE = 'mygate'
export const COMPANY_ID = 'main'
export const DARWINBOX_ORIGIN = 'https://mygate.darwinbox.in'
export const OFFICIAL_CAREERS_URL = 'https://mygate.com/careers/'
export const OFFICIAL_CAREERS_HANDOFF_URL =
  'https://mygate.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fothers___apply%3D1'
export const PUBLIC_PORTAL_URL = `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/allJobs`

const MYGATE_OPTIONS = {
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
}

const scraper = createDarwinboxScraper(MYGATE_OPTIONS)

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

export const createMyGateScraper = () =>
  createDarwinboxScraper(MYGATE_OPTIONS)
