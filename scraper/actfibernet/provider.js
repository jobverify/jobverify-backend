export const provider = {
  source: 'actfibernet',
  companyName: 'Act Fibernet',
  officialBrandName: 'ACT Fibernet',
  adapter: 'script',
  modulePath: '../actfibernet/script.js',
  companyCareerPage: 'https://www.actcorp.in/careers',
  fountainBoardUrl: 'https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5',
  atsPlatform: 'fountain',
  countryFilter: 'India',
  paginationStrategy: 'validate-official-careers-page-then-browser-load-public-fountain-board',
  extractionStrategy: 'official-careers-link-verification-plus-rendered-fountain-india-card-extraction',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'actcorp.in',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'Verified https://www.actcorp.in/careers and https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5 on July 14, 2026. The official ACT Fibernet careers page exposes a first-party "EXPLORE JOB OPENINGS" handoff to the public Fountain board, and the rendered board currently shows public Hyderabad, India openings with a See more control.',
  dryRunFile: 'actfibernet/jobs.json',
}

export default provider
