import { createDarwinboxScraper } from '../darwinbox/script.js'

const createConfiguredScraper = () => createDarwinboxScraper({
  companyName: 'Casagrand',
  source: 'casagrand',
  companyId: 'main',
  origin: 'https://casagrand.darwinbox.in',
})

const scraper = createConfiguredScraper()

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

export const createCasagrandScraper = createConfiguredScraper
