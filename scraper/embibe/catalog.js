export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.embibe.com/ is a live consumer SPA shell, that https://www.embibe.com/careers serves the same SPA shell rather than a standalone careers board, that https://www.embibe.com/in-en/home/ and https://www.embibe.com/in-en/contactus/ are live first-party marketing pages, that https://www.embibe.com/in-en/joinus/ is the live first-party Join Us page, and that its first-party page API at https://www.embibe.com/in-en/wp-json/wp/v2/pages/483 exposes employer-brand copy rather than public listings. The verified crawl surfaces at https://www.embibe.com/in-en/sitemap_index.xml and https://www.embibe.com/in-en/page-sitemap.xml did not publish careers or jobs URLs. The Join Us page links to https://embibe.darwinbox.in/ms/candidate/careers, but that route and adjacent public candidate routes resolved to the same empty branded shell titled "Indiavidual Learning Limited (Embibe)" with no job cards, job details, searchable listings, or structured JobPosting data. There is no trustworthy public jobs surface for Embibe.'

export const EMBIBE_CATALOG = {
  source: 'embibe',
  companyName: 'Embibe',
  officialBrandName: 'Indiavidual Learning Limited (Embibe)',
  adapter: 'script',
  modulePath: '../embibe/script.js',
  rootUrl: 'https://www.embibe.com/',
  rootCareersRouteUrl: 'https://www.embibe.com/careers',
  homepageUrl: 'https://www.embibe.com/in-en/home/',
  contactPageUrl: 'https://www.embibe.com/in-en/contactus/',
  companyCareerPage: 'https://www.embibe.com/in-en/joinus/',
  joinUsApiUrl: 'https://www.embibe.com/in-en/wp-json/wp/v2/pages/483',
  sitemapIndexUrl: 'https://www.embibe.com/in-en/sitemap_index.xml',
  pageSitemapUrl: 'https://www.embibe.com/in-en/page-sitemap.xml',
  darwinboxHandoffUrl: 'https://embibe.darwinbox.in/ms/candidate/careers',
  companyDomain: 'embibe.com',
  atsPlatform: 'official-company-careers-empty-shell',
  countryFilter: 'India',
  paginationStrategy: 'verified-root-shell-plus-first-party-join-us-page-plus-empty-darwinbox-shell-validation',
  extractionStrategy:
    'verified-root-shell+verified-marketing-homepage+verified-contact-page+verified-join-us-page+verified-join-us-api+verified-sitemap-surfaces+verified-empty-darwinbox-shell-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'embibe/jobs.json',
}

export default EMBIBE_CATALOG
