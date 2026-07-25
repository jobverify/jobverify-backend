export const provider = {
  source: 'napierhealthcaresolutions',
  companyName: 'Napier Healthcare Solutions',
  officialBrandName: 'Napier',
  adapter: 'script',
  modulePath: '../napierhealthcaresolutions/script.js',
  homepageUrl: 'https://www.napierhealthcare.com/v2/',
  companyCareerPage: 'https://www.napierhealthcare.com/v2/careers/',
  atsPlatform: 'official-careers-marketing-page-no-live-public-openings',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-validation',
  extractionStrategy: 'verified-first-party-careers-marketing-copy+no-live-same-domain-opening-links+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'napierhealthcare.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.napierhealthcare.com/v2/careers/ remained the live first-party Napier careers page, exposed the VIEW ALL OPENINGS call-to-action and resume-submission marketing copy, but did not expose any live same-domain public opening cards or role-detail links. Historical search-engine snippets for older Napier category pages were no longer reproducible on the live site, so this provider stays fail-closed until Napier publishes a trustworthy public jobs surface again.',
  dryRunFile: 'napierhealthcaresolutions/jobs.json',
}

export default provider
