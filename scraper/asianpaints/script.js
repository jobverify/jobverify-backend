import { createSuccessFactorsRmkScraper } from '../../scraper-support/shared/successFactorsRmk.js'

export const run = options => createSuccessFactorsRmkScraper({ source: 'asianpaints', companyName: 'Asian Paints',
  origin: 'https://careers.asianpaints.com', companyToken: 'C0013041173P' }).run(options)
