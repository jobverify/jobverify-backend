import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://transactions.nivabupa.com/Pages/career.aspx was the live first-party Niva Bupa careers page, that it advertised Careers with Niva Bupa plus Message From Our CEO and Employee Recognition sections, and that its inline redirect script sent candidates to the public Darwinbox handoff at https://disha.darwinbox.in/ms/candidate/careers. Also verified that https://disha.darwinbox.in/jobs resolved to the public Darwinbox shell at https://disha.darwinbox.in/ms/candidatev2/main/careers/home and that the enumerable all-jobs shell was hosted at https://disha.darwinbox.in/ms/candidatev2/main/careers/allJobs.'

export const NIVABUPA_CATALOG = {
  source: 'nivabupa',
  companyName: 'Niva Bupa',
  officialBrandName: 'Niva Bupa Health Insurance Company Limited',
  adapter: 'script',
  companyCareerPage: 'https://transactions.nivabupa.com/Pages/career.aspx',
  officialCareersHandoffUrl: 'https://disha.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://disha.darwinbox.in',
  darwinboxCompanyId: 'main',
  publicAllJobsUrl: 'https://disha.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  companyDomain: 'transactions.nivabupa.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'verified-first-party-careers-page+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'nivabupa/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default NIVABUPA_CATALOG
