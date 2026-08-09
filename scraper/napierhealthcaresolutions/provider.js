export const provider = {
  source: 'napierhealthcaresolutions',
  companyName: 'Napier Healthcare Solutions',
  officialBrandName: 'Napier',
  adapter: 'script',
  modulePath: '../../scraper/napierhealthcaresolutions/script.js',
  homepageUrl: 'http://www.napierhealthcare.com/v2/',
  companyCareerPage: 'http://www.napierhealthcare.com/v2/careers/',
  atsPlatform: 'official-careers-marketing-page-no-live-public-openings',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-validation',
  extractionStrategy: 'verified-first-party-careers-marketing-copy+no-live-same-domain-opening-links+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'napierhealthcare.com',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that the Napier /v2/ first-party site is currently reachable over http://www.napierhealthcare.com/v2/ and http://www.napierhealthcare.com/v2/careers/ because the corresponding https certificate is expired. The live careers page still exposed the VIEW ALL OPENINGS and current openings marketing copy, but did not expose any live same-domain public opening cards or role-detail links. This provider now validates the reachable http first-party careers page and stays fail-closed until Napier publishes a trustworthy public jobs surface again.',
  dryRunFile: 'napierhealthcaresolutions/jobs.json',
}

export default provider

