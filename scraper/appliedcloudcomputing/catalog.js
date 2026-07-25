import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BOARD_URL = 'https://careers.smartrecruiters.com/AppliedCloudComputing'
export const LISTING_API_URL =
  'https://api.smartrecruiters.com/v1/companies/AppliedCloudComputing/postings'
export const DETAIL_API_URL_TEMPLATE =
  'https://api.smartrecruiters.com/v1/companies/AppliedCloudComputing/postings/{{jobId}}'

export const APPLIED_CLOUD_COMPUTING_CATALOG = {
  source: 'appliedcloudcomputing',
  companyName: 'Applied Cloud Computing',
  officialBrandName: 'Applied Cloud Computing',
  adapter: 'script',
  homepageUrl: 'https://www.appliedcloudcomputing.com/',
  companyCareerPage: BOARD_URL,
  boardUrl: BOARD_URL,
  companyDomain: 'appliedcloudcomputing.com',
  atsPlatform: 'smartrecruiters',
  countryFilter: 'India',
  paginationStrategy: 'exact-name-smartrecruiters-board-plus-api',
  extractionStrategy:
    'verified-exact-name-smartrecruiters-board+official-homepage-link+smartrecruiters-jobs-api+detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.smartrecruiters.com/AppliedCloudComputing is the exact-name public Applied Cloud Computing careers board, that it links back to the official https://www.appliedcloudcomputing.com/ homepage, and that the board visibly lists at least "Cloud Operations Engineer (GCP & Kubernetes)" and "L3 Cloud Engineer - Applied Cloud Computing" in India. This local provider uses the SmartRecruiters jobs API and detail API after validating the branded board.',
  config: {
    request: {
      method: 'GET',
      query: {
        limit: '100',
        country: 'in',
      },
    },
    pagination: {
      strategy: 'offset-limit',
      pageSize: 100,
      offsetParam: 'offset',
      limitParam: 'limit',
      resultsPath: 'content',
      totalCountPath: 'totalFound',
    },
    mapping: {
      title: 'name',
      location: 'location.fullLocation',
      jobId: 'id',
      requisitionId: 'refNumber',
      sourceUrl: 'postingUrl',
      applyUrl: 'applyUrl',
      department: 'department.label',
      employmentType: 'typeOfEmployment.label',
      experienceLevel: 'experienceLevel.label',
      postingDate: 'releasedDate',
    },
    detail: {
      enabled: true,
      urlTemplate: DETAIL_API_URL_TEMPLATE,
      method: 'GET',
      mapping: {
        jobDescription: 'jobAd.sections.jobDescription.text',
        minimumQualification: 'jobAd.sections.qualifications.text',
        preferredQualification: 'jobAd.sections.additionalInformation.text',
      },
    },
    resultFilter: {
      include: [
        {
          field: 'location',
          pattern: '\\bIndia\\b',
        },
      ],
    },
    discovery: {
      listingApiUrl: LISTING_API_URL,
    },
  },
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'appliedcloudcomputing/jobs.json',
}

export default APPLIED_CLOUD_COMPUTING_CATALOG
