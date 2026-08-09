export const KAPIVA_CATALOG = {
  source: 'kapiva',
  companyName: 'Kapiva',
  officialBrandName: 'Kapiva',
  adapter: 'script',
  modulePath: '../../scraper/kapiva/script.js',
  dryRunFile: 'kapiva/jobs.json',
  homepageUrl: 'https://kapiva.in/',
  aboutPageUrl: 'https://kapiva.in/about-us/',
  contactPageUrl: 'https://kapiva.in/contact-us/',
  companyCareerPage: 'https://kapiva.in/contact-us/',
  companyDomain: 'kapiva.in',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-about-plus-contact-route-validation',
  extractionStrategy:
    'verified-homepage+verified-about-page+verified-contact-page-without-public-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://kapiva.in/, https://kapiva.in/about-us/, and https://kapiva.in/contact-us/ are live first-party Kapiva surfaces. The homepage is now a commerce storefront while the contact page still exposes the recruiting email careers@kapiva.in under "For openings and collaboration" through Cloudflare-protected email markup, but there are still no trustworthy public job listings, ATS handoff, role cards, or JobPosting markup, so the scraper returns an empty array until a real public jobs surface appears.',
}

export default KAPIVA_CATALOG

