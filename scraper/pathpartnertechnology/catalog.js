import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PATHPARTNER_TECHNOLOGY_CATALOG = {
  source: 'pathpartnertechnology',
  companyName: 'PathPartner Technology',
  officialBrandName: 'PathPartner Technology',
  adapter: 'script',
  homepageUrl: 'https://pathpartnertech.com/',
  companyCareerPage: 'https://pathpartnertech.com/about/',
  companyDomain: 'pathpartnertech.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-about-page-plus-page-sitemap-and-missing-routes',
  extractionStrategy:
    'verified-homepage+verified-about-page+verified-page-sitemap-without-careers-route+verified-missing-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on Tuesday, August 4, 2026 that https://pathpartnertech.com/ was the live exact-name first-party PathPartner homepage, that https://pathpartnertech.com/about/ was the published About Us route, that https://pathpartnertech.com/page-sitemap.xml listed the homepage and about page but no public careers or jobs route, and that https://pathpartnertech.com/career/, https://pathpartnertech.com/careers/, and https://pathpartnertech.com/jobs/ each returned first-party 404 pages instead of trustworthy job listings. The legacy https://www.pathpartnertech.com/career/ host currently fails certificate validation for this worker. No trustworthy public first-party jobs surface was exposed on the verified date, so this provider remains fail-closed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'pathpartnertechnology/jobs.json',
}

export default PATHPARTNER_TECHNOLOGY_CATALOG
