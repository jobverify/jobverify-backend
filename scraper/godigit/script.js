import { createDarwinboxScraper } from '../darwinbox/script.js'

const createConfiguredScraper = () => createDarwinboxScraper({
  companyName: 'Go Digit General Insurance',
  source: 'godigit',
  companyId: 'a651fdd75445d1',
  origin: 'https://godigit.darwinbox.in',
})

const scraper = createConfiguredScraper()

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

export const createGoDigitScraper = createConfiguredScraper
