import { createVerifiedCareersSurfaceScraper } from './verifiedCareersSurface.js'

export const CAREERS_URL = 'https://vakilsearch.hire.trakstar.com/'

export const run = (options) => createVerifiedCareersSurfaceScraper({
  company: 'Vakilsearch', careersUrl: CAREERS_URL, source: 'vakilsearch',
}).run(options)
