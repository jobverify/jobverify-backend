import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FRONTROW_CATALOG = {
  source: 'frontrow',
  companyName: 'FrontRow',
  officialBrandName: 'FrontRow',
  adapter: 'script',
  homepageUrl: 'https://frontrow.co.in/',
  companyCareerPage: 'https://frontrow.co.in/',
  shutdownUpdateUrl: 'https://medium.com/@frontrowblog/frontrow-update-6ac848595ed2',
  companyDomain: 'frontrow.co.in',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-shutdown-redirect-plus-verified-update-article',
  extractionStrategy: 'verified-homepage-redirect-to-official-shutdown-update-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://frontrow.co.in/ resolves to FrontRow’s official shutdown notice at https://medium.com/@frontrowblog/frontrow-update-6ac848595ed2, where the FrontRow-authored update says the company "shut down a few months ago." No trustworthy public jobs surface was discoverable for FrontRow on the verified date.',
  dryRunFile: 'frontrow/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default FRONTROW_CATALOG
