import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ONE_MG_CATALOG = {
  source: '1mg',
  companyName: '1mg',
  adapter: 'script',
  companyCareerPage: 'https://www.1mg.com/jobs',
  companyDomain: '1mg.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'official-careers-page+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialCareersHandoffUrl: 'https://1mg.darwinbox.in/jobs',
  darwinboxOrigin: 'https://1mg.darwinbox.in',
  darwinboxCompanyId: 'main',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'Verified on July 14, 2026 that https://www.1mg.com/jobs is the current first-party careers page for 1mg and explicitly links job seekers to the official Darwinbox handoff at https://1mg.darwinbox.in/jobs, which redirects into the public Tata 1mg candidate portal.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ONE_MG_CATALOG
