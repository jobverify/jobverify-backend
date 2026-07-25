import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MAVEN_WAVE_PARTNERS_CATALOG = {
  source: 'mavenwavepartners',
  companyName: 'Maven Wave Partners',
  officialBrandName: 'Maven Wave Partners',
  adapter: 'script',
  homepageUrl: 'https://www.mavenwave.com/',
  companyCareerPage: 'https://jobs.jobvite.com/maven-wave-partners/jobAlerts',
  companyDomain: 'mavenwave.com',
  atsPlatform: 'redirected-homepage-plus-jobvite-job-alerts-only',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed-sentinel',
  extractionStrategy:
    'verified-homepage-redirect-to-atos+jobvite-job-alerts-without-trustworthy-current-openings+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.mavenwave.com/ redirected to Atos, while the branded public Maven Wave surface still reachable at https://jobs.jobvite.com/maven-wave-partners/jobAlerts only exposed Jobvite job-alert signup categories and locations such as Chandigarh, Gurgaon, and India instead of a trustworthy current openings inventory. This company therefore remains fail-closed.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'mavenwavepartners/jobs.json',
}

export default MAVEN_WAVE_PARTNERS_CATALOG
