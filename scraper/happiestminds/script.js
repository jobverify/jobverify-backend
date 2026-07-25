import { createDarwinboxScraper } from '../darwinbox/script.js'

const scraper = createDarwinboxScraper({
  companyName: 'Happiest Minds',
  source: 'happiestminds',
  origin: 'https://smileshrms.darwinbox.com',
})

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

export const createHappiestMindsScraper = () => createDarwinboxScraper({
  companyName: 'Happiest Minds',
  source: 'happiestminds',
  origin: 'https://smileshrms.darwinbox.com',
})
