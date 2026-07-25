import { createDarwinboxScraper } from '../darwinbox/script.js'

const createConfiguredScraper = () => createDarwinboxScraper({
  companyName: 'TVS Motor Company',
  source: 'tvsmotorcompany',
  companyId: '5ffc190a05f27',
  origin: 'https://tvsmsampark.darwinbox.in',
})

const scraper = createConfiguredScraper()

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

export const createTVSMotorCompanyScraper = createConfiguredScraper
