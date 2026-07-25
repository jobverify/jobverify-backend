import { createDarwinboxScraper } from '../darwinbox/script.js'

const createConfiguredScraper = () => createDarwinboxScraper({
  companyName: 'Ashok Leyland',
  source: 'ashokleyland',
  companyId: 'a61cb038c35a54',
  origin: 'https://ashokleyland.darwinbox.in',
})

const scraper = createConfiguredScraper()

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

export const createAshokLeylandScraper = createConfiguredScraper
