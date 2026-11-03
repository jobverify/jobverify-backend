export const VERIFIED_SURFACE_SUMMARY = "Verified November 3, 2026 that https://www.dentalkart.com/, https://www.dentalkart.com/about-us, and https://www.dentalkart.com/careers actively link https://dentalkart.zohorecruit.in/jobs/Careers. The public portal identifies VASA Denticity Limited and www.dentalkart.com. Its embedded inventory and public API agree on 31 records, including 18 published, unlocked India openings. Each run rechecks all native records against a closing API read; changed or unavailable closing inventory stays partial and cannot authorize cleanup."

export const DENTALKART_CATALOG = {
  source: 'dentalkart', companyName: 'Dentalkart', legalEmployerName: 'VASA Denticity Limited',
  adapter: 'script', modulePath: '../../scraper/dentalkart/script.js',
  companyCareerPage: 'https://www.dentalkart.com/careers', homepageUrl: 'https://www.dentalkart.com/',
  aboutPageUrl: 'https://www.dentalkart.com/about-us', companyDomain: 'dentalkart.com',
  officialCareersHandoffUrl: 'https://dentalkart.zohorecruit.in/jobs/Careers',
  zohoJobsApiUrl: 'https://dentalkart.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  atsPlatform: 'zoho-recruit', countryFilter: 'India',
  paginationStrategy: 'complete-zoho-api-inventory-verified-against-public-portal',
  extractionStrategy: 'verified-first-party-zoho-handoff+verified-legal-employer+complete-published-unlocked-india-inventory',
  parser: 'custom-script', normalizationProfile: 'engineering-default', verifiedOn: '2026-11-03',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}
export default DENTALKART_CATALOG
