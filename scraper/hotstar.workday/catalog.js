import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.hotstar.com/ is the official Hotstar brand homepage, that https://www.jiostar.com/ is the live first-party JioStar corporate surface, and that its Careers handoff points to the public JioStar Workday board at https://jiostar.wd102.myworkdayjobs.com/JioStar. Verified that the public Workday jobs API at https://jiostar.wd102.myworkdayjobs.com/wday/cxs/jiostar/JioStar/jobs returns 84 India roles when queried with searchText=JioHotstar, including https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Chennai---Kochar-Jade/Assistant-Manager---Marketing--JioHotstar--South-_JR11910 and its public apply URL. Also verified that legacy tech-jobs.hotstar.com is not a trustworthy active public board.'

export const HOTSTAR_CATALOG = {
  source: 'hotstar',
  companyName: 'Hotstar',
  officialBrandName: 'JioHotstar',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'hotstar.workday/jobs.json',
  homepageUrl: 'https://www.hotstar.com/',
  companyCareerPage: 'https://www.jiostar.com/',
  officialWorkdayBoardUrl: 'https://jiostar.wd102.myworkdayjobs.com/JioStar',
  jobsApiUrl: 'https://jiostar.wd102.myworkdayjobs.com/wday/cxs/jiostar/JioStar/jobs',
  verifiedKeyword: 'JioHotstar',
  verifiedJobUrl:
    'https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Chennai---Kochar-Jade/Assistant-Manager---Marketing--JioHotstar--South-_JR11910',
  verifiedApplyUrl:
    'https://jiostar.wd102.myworkdayjobs.com/JioStar/job/Chennai---Kochar-Jade/Assistant-Manager---Marketing--JioHotstar--South-_JR11910/apply',
  companyDomain: 'hotstar.com',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-parent-careers-handoff-plus-keyworded-workday-search',
  extractionStrategy:
    'verified-hotstar-brand-homepage+verified-jiostar-careers-page+verified-workday-board+keyworded-workday-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default HOTSTAR_CATALOG
