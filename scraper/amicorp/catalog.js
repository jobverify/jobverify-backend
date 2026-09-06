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
  verifiedOn: '2026-09-03',
  verifiedSurfaceSummary:
    'Verified on September 3, 2026 that https://amicorp.com/ami-news/careers/ is the live first-party Amicorp careers hub with the title "Careers - Amicorp" and same-domain role cards, that https://amicorp.com/page-sitemap1.xml advertises first-party careers detail URLs including https://amicorp.com/ami-news/careers/senior-local-fund-operations-amif-jd1551/, and that those first-party detail pages expose the shared Zoho public application form URL for applying. Current India listings include Senior Local Fund Operations (AMIF) and Central Fund Accountant roles; detail pages publish their current posting metadata as og:updated_time.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AMICORP_CATALOG
