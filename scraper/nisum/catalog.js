import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NISUM_CATALOG = {
  source: 'nisum',
  companyName: 'Nisum',
  officialBrandName: 'Nisum',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  homepageUrl: 'https://www.nisum.com/',
  officialCareersLandingUrl: 'https://www.nisum.com/careers',
  companyCareerPage: 'https://www.nisum.com/careers/careers-india',
  ceipalWidgetScriptUrl: 'https://jobsapi.ceipal.com/APISource/widget.js',
  ceipalWidgetUrl: 'https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09&cp_id=Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
  ceipalJobPostingsApiBaseUrl: 'https://careerapi.ceipal.com/SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09/CareerPortalJobPostings/',
  ceipalApiKey: 'SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09',
  ceipalCareerPortalId: 'Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09',
  atsPlatform: 'ceipal-careerapi',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-flow-plus-ceipal-jobpostings-api-pagination',
  extractionStrategy: 'verified-homepage+verified-global-careers+verified-india-careers+ceipal-widget-config+careerportaljobpostings-api+india-country-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'nisum.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.nisum.com/ links to the first-party careers landing page at https://www.nisum.com/careers, that the India careers page at https://www.nisum.com/careers/careers-india exposes the CEIPAL widget configuration for api key SGhXQ3RNWlVBV2JZRGpZbytlMjZ1dz09 and portal id Z3RkUkt2OXZJVld2MjFpOVRSTXoxZz09, and that the public CareerPortalJobPostings API behind that widget returned 51 total jobs including India roles such as .Net Full Stack Developer, Data Engineer, and ML Engineer GenAI Applications.',
  dryRunFile: 'nisum/jobs.json',
}

export default NISUM_CATALOG
