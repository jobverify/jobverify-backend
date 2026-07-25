import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.gokwik.co/about?_gc=1 is the live first-party GoKwik about page and that it links to the public Keka board at https://gokwik.keka.com/careers. Live verification on July 16, 2026 confirmed https://gokwik.keka.com/careers/api/organization/default/careerportalinfo, https://gokwik.keka.com/careers/api/embedjobs/default/active/19d678f6-8b79-4532-a5f0-d57b593a822e, and https://gokwik.keka.com/careers/api/embedjobs/departments/19d678f6-8b79-4532-a5f0-d57b593a822e returning the public GoKwik careers portal and active public India jobs.'

export const GOKWIK_CATALOG = {
  source: 'gokwik',
  companyName: 'GoKwik',
  officialBrandName: 'GoKwik',
  adapter: 'script',
  homepageUrl: 'https://www.gokwik.co/',
  companyAboutPage: 'https://www.gokwik.co/about?_gc=1',
  companyCareerPage: 'https://gokwik.keka.com/careers',
  careerPortalInfoUrl: 'https://gokwik.keka.com/careers/api/organization/default/careerportalinfo',
  activeJobsUrl: 'https://gokwik.keka.com/careers/api/embedjobs/default/active/19d678f6-8b79-4532-a5f0-d57b593a822e',
  departmentsUrl: 'https://gokwik.keka.com/careers/api/embedjobs/departments/19d678f6-8b79-4532-a5f0-d57b593a822e',
  expectedKekaDomain: 'https://gokwik.keka.com/careers/',
  expectedIdentifier: '19d678f6-8b79-4532-a5f0-d57b593a822e',
  companyDomain: 'gokwik.co',
  atsPlatform: 'keka-embed-api',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-about-page-plus-keka-active-jobs-endpoints',
  extractionStrategy:
    'verified-first-party-about-page+verified-keka-careers-link+careerportalinfo+active-keka-embed-api+departments+jobdetails+applyjob',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'gokwik/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default GOKWIK_CATALOG
