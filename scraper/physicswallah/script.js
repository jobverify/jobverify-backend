import { createDarwinboxScraper } from '../darwinbox/script.js'

export const COMPANY_NAME = 'PhysicsWallah'
export const SOURCE = 'physicswallah'
export const COMPANY_ID = 'a62d7a6e288992'
export const DARWINBOX_ORIGIN = 'https://pwhr.darwinbox.in'
export const OFFICIAL_CAREERS_URL = 'https://www.pw.live/'
export const PUBLIC_PORTAL_URL = `${DARWINBOX_ORIGIN}/ms/candidatev2/${COMPANY_ID}/careers/home`

const createConfiguredScraper = () => createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

export const createPhysicsWallahScraper = ({
  now = () => new Date().toISOString(),
} = {}) => {
  const baseScraper = createConfiguredScraper()

  return {
    ...baseScraper,
    run: async (options = {}) => {
      const jobs = await baseScraper.run(options)
      const scrapedAt = now()

      return jobs.map((job) => ({
        ...job,
        scrapedAt,
      }))
    },
  }
}

const scraper = createPhysicsWallahScraper()

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper
