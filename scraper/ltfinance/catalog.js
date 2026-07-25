import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LT_FINANCE_CATALOG = {
  source: 'ltfinance',
  companyName: 'L&T Finance',
  officialBrandName: 'L&T Finance',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'ltfinance/jobs.json',
  companyCareerPage: 'https://www.ltfinance.com/careers',
  jobsBoardUrl: 'https://myltfs.ltfs.com/CPortal/GeneralOpening.aspx',
  jobsApiUrl: 'https://myltfs.ltfs.com/CPortal/generalopening.aspx/GetCurrentopening',
  companyDomain: 'ltfinance.com',
  atsPlatform: 'workline-public-jobs-api',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-handoff-plus-workline-current-opening-api',
  extractionStrategy: 'verified-first-party-careers-page+workline-handoff+currentopening-json-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.ltfinance.com/careers is the official L&T Finance careers page and links current openings to the public Workline board at https://myltfs.ltfs.com/CPortal/GeneralOpening.aspx. The public Workline listing endpoint at https://myltfs.ltfs.com/CPortal/generalopening.aspx/GetCurrentopening returned live public openings on the verified date, so this provider extracts jobs from that first-party handoff and fails closed if the careers page or JSON contract drifts.',
}

export default LT_FINANCE_CATALOG
