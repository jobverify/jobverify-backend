export const VERIFIED_SURFACE_SUMMARY = "Verified on October 8, 2026 that https://www.dentalkart.com/, https://www.dentalkart.com/about-us, and https://www.dentalkart.com/careers now expose the official careers handoff to https://dentalkart.zohorecruit.in/jobs/Careers. The public Zoho portal identifies the legal employer as VASA Denticity Limited and links its website to www.dentalkart.com. Its embedded inventory and public API at https://dentalkart.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite expose the same 34 records: 24 published, unlocked India openings and ten retained unpublished, locked roles. This scraper verifies the full portal/API inventory and excludes closed retained records."

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
  parser: 'custom-script', normalizationProfile: 'engineering-default', verifiedOn: '2026-10-08',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}
export default DENTALKART_CATALOG
