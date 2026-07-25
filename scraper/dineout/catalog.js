import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.dineout.co.in/ is live but canonicalizes to the Swiggy consumer surface at https://www.swiggy.com/dineout rather than a careers page. Verified that https://www.dineout.co.in/careers, https://www.dineout.co.in/careers/, https://www.dineout.co.in/jobs, https://www.dineout.co.in/jobs/, https://www.dineout.co.in/work-with-us, and https://www.dineout.co.in/join-us all redirect to https://www.swiggy.com/restaurants-near-me and terminate on a blocked 403 page. Verified that the parent first-party careers shell at https://careers.swiggy.com/ loads the integration script at https://careers.swiggy.com/assets/js/careers-integration.js and the public board at https://swiggy.mynexthire.com/employer/jobs/careers, while https://swiggy.mynexthire.com/employer/jobboard/details_by_shortname/get/swiggy/ is Swiggy-branded and exposes no Dineout-attributable public roles. There is no trustworthy public jobs surface attributable to Dineout right now.'

export const DINEOUT_CATALOG = {
  source: 'dineout',
  companyName: 'Dineout',
  officialBrandName: 'Swiggy Dineout',
  parentCompanyName: 'Swiggy',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'dineout/jobs.json',
  homepageUrl: 'https://www.dineout.co.in/',
  canonicalConsumerSurfaceUrl: 'https://www.swiggy.com/dineout',
  companyCareerPage: 'https://careers.swiggy.com/',
  careersIntegrationScriptUrl: 'https://careers.swiggy.com/assets/js/careers-integration.js',
  jobsBoardUrl: 'https://swiggy.mynexthire.com/employer/jobs/careers',
  jobsBoardDetailsUrl: 'https://swiggy.mynexthire.com/employer/jobboard/details_by_shortname/get/swiggy/',
  redirectedNoTrustRouteUrl: 'https://www.swiggy.com/restaurants-near-me',
  companyDomain: 'dineout.co.in',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-dineout-consumer-homepage-plus-parent-careers-surface-check',
  extractionStrategy:
    'verified-dineout-homepage-canonicalized-to-swiggy-dineout+verified-dineout-career-routes-redirect-away+verified-parent-swiggy-careers-surface-without-dineout-attributable-public-roles',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default DINEOUT_CATALOG
