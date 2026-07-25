import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BAJAJ_ALLIANZ_CATALOG = {
  source: 'bajajallianz',
  companyName: 'Bajaj Allianz',
  officialBrandName: 'Bajaj General Insurance (Formerly Bajaj Allianz)',
  legalEntityName: 'Bajaj General Insurance Limited',
  adapter: 'script',
  companyCareerPage: 'https://jobs.bajajgeneral.com/',
  homepageUrl: 'https://www.bajajallianz.com/',
  redirectedHomepageUrl: 'https://www.bajajgeneralinsurance.com/',
  jobsPortalUrl: 'https://jobs.bajajgeneral.com/',
  jobsPortalShellRouteUrls: [
    'https://jobs.bajajgeneral.com/',
    'https://jobs.bajajgeneral.com/bajajgeneral/search-jobs',
  ],
  brokenCareersRouteUrls: [
    'https://www.bajajgeneralinsurance.com/careers',
    'https://www.bajajgeneralinsurance.com/careers.html',
  ],
  atsPlatform: 'official-company-careers-nonlisting',
  countryFilter: 'India',
  paginationStrategy:
    'legacy-brand-redirect-plus-current-homepage-jobs-handoff-plus-jobs-shell-and-broken-direct-careers-route-validation',
  extractionStrategy:
    'verified-legacy-homepage-redirect+verified-current-homepage-careers-link+verified-jobs-shell-routes-without-public-listings+verified-broken-direct-careers-route-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'jobs.bajajgeneral.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.bajajallianz.com/ now redirects to the live first-party homepage https://www.bajajgeneralinsurance.com/, whose footer Careers link points to https://jobs.bajajgeneral.com/. The first-party jobs shell is live on both https://jobs.bajajgeneral.com/ and https://jobs.bajajgeneral.com/bajajgeneral/search-jobs with the title "Bajaj General Insurance Limited - Career", base href /bajajgeneral/, and openings.co shell markers, but no trustworthy public listings endpoint was verified. The direct first-party careers route https://www.bajajgeneralinsurance.com/careers redirects into https://www.bajajgeneralinsurance.com/careers.html, which returned a first-party 404 on the verified date, so there is no trustworthy public jobs surface right now.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default BAJAJ_ALLIANZ_CATALOG
