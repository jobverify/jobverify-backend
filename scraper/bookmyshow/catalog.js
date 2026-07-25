export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://in.bookmyshow.com/ is the live India BookMyShow homepage, https://in.bookmyshow.com/careers is the current first-party careers shell, and https://in.bookmyshow.com/careers/job-listing is the linked first-party job-listing route. The careers shell exposes BookMyShow recruiting copy and location/team filters, but the job-listing route currently renders only a breadcrumb-plus-footer shell with no public job cards, public detail pages, ATS handoff, or structured job records. Direct automated fetches and Playwright rendering to both careers URLs also returned Cloudflare 403 blocked pages during live checks, so there is no trustworthy public jobs surface to scrape.'

export const BOOK_MY_SHOW_CATALOG = {
  source: 'bookmyshow',
  companyName: 'BookMyShow',
  adapter: 'script',
  modulePath: '../bookmyshow/script.js',
  companyCareerPage: 'https://in.bookmyshow.com/careers',
  homepageUrl: 'https://in.bookmyshow.com/',
  jobListingUrl: 'https://in.bookmyshow.com/careers/job-listing',
  companyDomain: 'in.bookmyshow.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-shell-plus-empty-job-listing-shell-or-cloudflare-block',
  extractionStrategy:
    'verified-first-party-careers-page+verified-empty-job-listing-shell-or-cloudflare-block-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default BOOK_MY_SHOW_CATALOG
