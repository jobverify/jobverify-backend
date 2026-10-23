export const AXIS_SECURITIES_CATALOG = {
  source: 'axissecurities', companyName: 'Axis Securities', officialBrandName: 'Axis Securities', exactCompanyMatchOnly: true,
  adapter: 'script', modulePath: '../axissecurities/script.js', dryRunFile: 'axissecurities/jobs.json',
  companyCareerPage: 'https://simplehai.axisdirect.in/portal/careers', companyDomain: 'axisdirect.in',
  officialAtsUrl: 'https://axissecurities.ripplehire.com/candidate/?token=aA6ANFk4CHLUkuOVBmxq&source=CAREERSITE#list',
  nativeInventoryUrl: 'https://axissecurities.ripplehire.com/candidate/candidatejobsearch',
  atsPlatform: 'ripplehire', countryFilter: 'India', paginationStrategy: 'native-zero-based-page-size10-stable-count-and-offset-reconciliation',
  extractionStrategy: 'fresh-official-CTA+native-company296-AXISSL-binding+all-native-pages-and-details+explicit-country-only',
  parser: 'custom-script', normalizationProfile: 'engineering-default', verifiedOn: '2026-10-23',
  verifiedPublicJobCount: 77, verifiedIndiaJobCount: null,
  verifiedSurfaceSummary: 'October 23, 2026: the first-party Axis Securities careers View Current Openings button links the public RippleHire board. Fresh native company and all77 details bind employer296/AXISSL/Axis Securities Limited. Eight unfiltered pages reconcile77 unique active public records and77 details. Every native jobLocation/locations supplies a city label but countryMstNewSeq and jobLocationList are null, so the country scope remains unresolved for all77. Eligible output is currently[] with coverage-gap evidence and reportedTotal77, never verified-empty; India facet count remains unknown. Raw77 discoveries are retained in captures and replay-summary. Placeholder/title-only/short/inert descriptions remain partial; genuine employer content is never fabricated. Publication uses the earliest known strict native jobPostingDate or publishDetails.CAREER_SITE, retaining both original fields and never using creation/open/scrape dates. Unknown/new primary or secondary geography is rejected for review.',
}
export default AXIS_SECURITIES_CATALOG
