export const LAMBDATEST_CATALOG = {
  source: 'lambdatest',
  companyName: 'LambdaTest',
  officialBrandName: 'TestMu AI (Formerly LambdaTest)',
  adapter: 'script',
  modulePath: '../lambdatest/script.js',
  dryRunFile: 'lambdatest/jobs.json',
  homepageUrl: 'https://www.lambdatest.com/',
  legacyCareersPageUrl: 'https://www.lambdatest.com/careers',
  companyCareerPage: 'https://www.testmuai.com/career/',
  activeJobsApiUrl: 'https://test-backend.lambdatest.com/api/careers-page/active-jobs',
  departmentsApiUrl: 'https://test-backend.lambdatest.com/api/careers-page/org-departments',
  externalJobDetailBaseUrl: 'https://lambdatest.kekahire.com/jobdetails/',
  atsPlatform: 'custom-json-api',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-active-jobs-endpoint',
  extractionStrategy:
    'verified-first-party-careers-page+first-party-active-jobs-api+department-verification+external-keka-jobdetail-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'lambdatest.com',
  verifiedOn: '2026-07-16',
  verifiedPublicPostingCount: 9,
  verifiedIndiaPostingCount: 8,
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.lambdatest.com/careers redirects to the live first-party careers surface at https://www.testmuai.com/career/, that the careers shell exposes public openings for TestMu AI (Formerly LambdaTest), that the first-party APIs at https://test-backend.lambdatest.com/api/careers-page/active-jobs and https://test-backend.lambdatest.com/api/careers-page/org-departments are live, and that the active jobs endpoint returned 9 public postings including 8 India postings.',
}

export default LAMBDATEST_CATALOG
