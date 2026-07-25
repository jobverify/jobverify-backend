import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const SUREPREP_CATALOG = {
  source: 'sureprep',
  companyName: 'SurePrep',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://sureprep.com/',
  companyDomain: 'sureprep.com',
  homepageUrl: 'https://sureprep.com/',
  evidenceUrl: 'https://sureprep.com/',
  loginUrl: 'https://sso.sureprep.com/',
  officialBrandName: 'SurePrep',
  officialLoginTitle: 'SurePrep FileRoom Login',
  officialLoginProvider: 'Thomson Reuters Account',
  atsPlatform: 'no-public-jobs-surface',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed',
  extractionStrategy: 'verified-login-surface-without-public-jobs',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: 'Saturday, July 18, 2026: SurePrep exposed a Thomson Reuters-backed FileRoom login surface at https://sso.sureprep.com/ but no trustworthy public first-party careers or jobs listings for the exact SurePrep brand.',
}

export default SUREPREP_CATALOG
