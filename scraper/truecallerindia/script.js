import { createVerifiedCareersSurfaceScraper } from './verifiedCareersSurface.js'

export const CAREERS_URL = 'https://www.truecaller.com/careers'

export const run = (options) => createVerifiedCareersSurfaceScraper({
  company: 'Truecaller India', careersUrl: CAREERS_URL, source: 'truecallerindia',
}).run(options)
