export const provider = {
  source: 'raybusinesstechnologies',
  companyName: 'Ray Business Technologies',
  officialBrandName: 'Ray Business Technologies Pvt. Ltd.',
  adapter: 'script',
  modulePath: '../raybusinesstechnologies/script.js',
  homepageUrl: 'https://raybiztech.com/',
  companyCareerPage: 'https://raybiztech.com/about-us/careers/current-openings',
  atsPlatform: 'first-party-careers-shell-without-public-openings',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed-no-trustworthy-public-listings',
  extractionStrategy: 'verified-first-party-careers-shell+no-accessibly-rendered-public-openings+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'raybiztech.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://raybiztech.com/about-us/careers/current-openings was the live first-party Ray Business Technologies careers shell, but the fetched public HTML only exposed the employer branding copy and the Current Openings shell without any accessibly rendered job cards, titles, or apply links. Because no trustworthy public openings listing was fetchable from the verified exact-name first-party surface, this provider remains fail-closed.',
  dryRunFile: 'raybusinesstechnologies/jobs.json',
}

export default provider
