import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.travis-ci.com/ was the live first-party Travis CI homepage, that https://www.travis-ci.com/about-us/ confirmed Travis CI became part of Idera, Inc. in 2019, that https://docs.travis-ci.com/imprint.html listed Travis CI GmbH in Leverkusen and linked Work with Travis CI to https://apply.workable.com/travisci/, and that the public Workable surfaces at https://apply.workable.com/travisci/, https://apply.workable.com/travisci/jobs.md, and https://apply.workable.com/api/v1/widget/accounts/travisci were live while both the jobs markdown feed and widget API reported zero current openings. Also verified that https://www.travis-ci.com/careers and https://www.travis-ci.com/jobs returned first-party 404 pages on the verified date.'

export const TRAVISCI_CATALOG = {
  source: 'travisci',
  companyName: 'Travis CI',
  officialBrandName: 'Travis CI',
  adapter: 'script',
  homepageUrl: 'https://www.travis-ci.com/',
  aboutPageUrl: 'https://www.travis-ci.com/about-us/',
  imprintPageUrl: 'https://docs.travis-ci.com/imprint.html',
  companyCareerPage: 'https://apply.workable.com/travisci/',
  workableBoardUrl: 'https://apply.workable.com/travisci/',
  jobsFeedUrl: 'https://apply.workable.com/travisci/jobs.md',
  widgetApiUrl: 'https://apply.workable.com/api/v1/widget/accounts/travisci',
  noPublicJobRouteUrls: [
    'https://www.travis-ci.com/careers',
    'https://www.travis-ci.com/jobs',
  ],
  companyDomain: 'travis-ci.com',
  atsPlatform: 'first-party-imprint-handoff-workable',
  countryFilter: 'India',
  paginationStrategy: 'official-homepage-imprint-handoff-plus-workable-jobs-md-feed',
  extractionStrategy:
    'verified-first-party-homepage+verified-about-page+verified-imprint+verified-main-domain-404-routes+verified-workable-board+verified-workable-jobs-feed+widget-api-empty-state',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedPublicJobCount: 0,
  verifiedIndiaJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'travisci/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default TRAVISCI_CATALOG
