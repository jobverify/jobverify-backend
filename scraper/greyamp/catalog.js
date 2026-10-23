export const GREYAMP_CATALOG={
  source:'greyamp',companyName:'Greyamp',officialBrandName:'Greyamp',adapter:'script',
  modulePath:'../greyamp/script.js',dryRunFile:'greyamp/jobs.json',companyDomain:'greyamp.com',
  companyCareerPage:'https://www.greyamp.com/careers',atsPlatform:'first-party-native-job-api-with-unresolved-country-scope',
  nativeJobsApiUrl:'https://www.greyamp.com/api/job-openings',
  paginationStrategy:'reviewed-linked-client-single-unfiltered-native-array',
  extractionStrategy:'fresh-official-careers+reviewed-client+all-native-role-fields+employer-form-choice-parity',
  verifiedOn:'2026-10-23',verifiedPublicJobCount:3,verifiedIndiaJobCount:null,sourceListingComplete:false,
  verifiedSurfaceSummary:'October 23, 2026: the current first-party careers page links a reviewed client that reads the complete /api/job-openings array. It publishes three identified roles with descriptions and role-specific choices on the linked Greyamp Consulting Google application form. All three locations say Bangalore with travel to client locations based on requirement, without explicit country or secondary-country fields. Native facts are inspectable, but eligible output withholds unverified country scope and reports coverage-gap with observed total3 and unknown India count. This is not verified empty. Publication dates are absent and remain null.',
}
export default GREYAMP_CATALOG
