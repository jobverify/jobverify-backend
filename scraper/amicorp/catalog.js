import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AMICORP_CATALOG = {
  source: 'amicorp',
  companyName: 'Amicorp',
  officialBrandName: 'Amicorp',
  adapter: 'script',
  companyCareerPage: 'https://amicorp.com/ami-news/careers/',
  homepageUrl: 'https://amicorp.com/',
  careersPageUrl: 'https://amicorp.com/ami-news/careers/',
  pageSitemapUrl: 'https://amicorp.com/page-sitemap1.xml',
  trustedApplyFormUrl:
    'https://forms.zohopublic.eu/zohopeople40/form/CareerPageForm/formperma/eclRamd2dWW4rbcIcyYbA0ooIb_3CA2MBYGp_56EYyY',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-first-party-page-sitemap-validation',
  extractionStrategy:
    'verified-first-party-careers-page+first-party-detail-pages+shared-zoho-public-apply-form+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'amicorp.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://amicorp.com/ami-news/careers/ is the live first-party Amicorp careers hub with the title "Careers - Amicorp" and same-domain role cards, that https://amicorp.com/page-sitemap1.xml advertises first-party careers detail URLs including https://amicorp.com/ami-news/careers/senior-group-legal-jd1440/ and https://amicorp.com/ami-news/careers/central-fund-accountant-bl-ct-mu-cl-jd1527/, and that those first-party detail pages expose the shared Zoho public application form URL for applying. Current India listings verified on the hub included Senior Group Legal and Central Fund Accountant - BL, CT, MU, CL.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AMICORP_CATALOG
