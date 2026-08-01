export const provider = {
  source: 'agilentindia',
  companyName: 'Agilent India',
  officialBrandName: 'Agilent',
  adapter: 'script',
  modulePath: '../agilentindia.workday/script.js',
  companyCareerPage: 'https://careers.agilent.com/',
  indiaLocationPage: 'https://careers.agilent.com/locations/asia-pacific/india/',
  experiencedWorkdayPage: 'https://agilent.wd5.myworkdayjobs.com/Agilent_Careers',
  studentWorkdayPage: 'https://agilent.wd5.myworkdayjobs.com/Agilent_Student_Careers',
  experiencedJobsApiUrl: 'https://agilent.wd5.myworkdayjobs.com/wday/cxs/agilent/Agilent_Careers/jobs',
  studentJobsApiUrl: 'https://agilent.wd5.myworkdayjobs.com/wday/cxs/agilent/Agilent_Student_Careers/jobs',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-pages-plus-dual-workday-country-facet-apis',
  extractionStrategy:
    'verified-careers-home+verified-india-location-page+experienced-workday-jobs-api+student-workday-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'agilent.com',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    "Verified https://careers.agilent.com/ and https://careers.agilent.com/locations/asia-pacific/india/ on July 14, 2026. Agilent's official first-party careers shell and India location page both hand applicants to public Workday boards at https://agilent.wd5.myworkdayjobs.com/Agilent_Careers and https://agilent.wd5.myworkdayjobs.com/Agilent_Student_Careers for experienced and grad/student roles.",
  dryRunFile: 'agilentindia.workday/jobs.json',
}

export default provider
