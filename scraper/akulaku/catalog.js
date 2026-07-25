import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.akulaku.com/staff-life is the live first-party Akulaku careers shell, that the page includes a public "Lihat Lowongan" handoff to the official Akulaku jobs board at https://akulaku.zhiye.com/, and that the public listings page at https://akulaku.zhiye.com/alljob/?o=1 is live on the same official board surface. Live checks on July 15, 2026 found public jobs on the linked board but no India roles on the verified public listings surface at the time of verification.'

export const AKULAKU_CATALOG = {
  source: 'akulaku',
  companyName: 'Akulaku',
  officialBrandName: 'Akulaku',
  adapter: 'script',
  companyCareerPage: 'https://www.akulaku.com/staff-life',
  firstPartyCareersUrl: 'https://www.akulaku.com/staff-life',
  officialJobsBoardUrl: 'https://akulaku.zhiye.com/',
  jobListingsUrl: 'https://akulaku.zhiye.com/alljob/?o=1',
  companyDomain: 'akulaku.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-shell-plus-linked-zhiye-next-link-pagination',
  extractionStrategy:
    'first-party-shell-link-verification+zhiye-list-parse+india-location-filter+detail-fetch-for-india-matches',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'akulaku/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default AKULAKU_CATALOG
