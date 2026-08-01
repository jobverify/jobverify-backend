import { createVerifiedCareersSurfaceScraper } from './verifiedCareersSurface.js'

export const CAREERS_URL = 'https://www.trukker.com/careers'

export const run = (options) => createVerifiedCareersSurfaceScraper({
  company: 'TruKKer India', careersUrl: CAREERS_URL, source: 'trukkerindia',
}).run(options)
