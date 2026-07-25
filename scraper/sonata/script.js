import { createDarwinboxScraper } from '../darwinbox/script.js'

const scraper = createDarwinboxScraper({
  companyName: 'Sonata Software',
  source: 'sonata',
  origin: 'https://sonataone.darwinbox.in',
})

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

export const createSonataScraper = () => createDarwinboxScraper({
  companyName: 'Sonata Software',
  source: 'sonata',
  origin: 'https://sonataone.darwinbox.in',
})
