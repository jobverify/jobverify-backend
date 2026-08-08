import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, August 7, 2026 that https://www.akulaku.com/staff-life is still the live first-party Akulaku careers shell and still links "Lihat Lowongan" to https://akulaku.zhiye.com/. Also verified that both the official jobs board URL https://akulaku.zhiye.com/ and the linked listings URL https://akulaku.zhiye.com/alljob/?o=1 currently resolve to the Beisen maintenance surface titled "Document" with the visible message "System Upgrade Maintenance" / "系统升级维护中", so no public job listings were accessible on the verified surface.'

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
    'first-party-shell-link-verification+zhiye-list-parse-or-verified-beisen-maintenance+india-location-filter+detail-fetch-for-india-matches',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-07',
  verifiedPublicJobCount: 0,
  verifiedIndiaJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'akulaku/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default AKULAKU_CATALOG
