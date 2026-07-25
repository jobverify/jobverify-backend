import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BOOKUWARUNG_CATALOG = {
  source: 'bukuwarung',
  companyName: 'Bukuwarung',
  officialBrandName: 'BukuWarung',
  legalEntityName: 'PT Buku Usaha Digital',
  adapter: 'script',
  companyCareerPage: 'https://www.bukuwarung.com/career/',
  homepageUrl: 'https://www.bukuwarung.com/',
  legacyHomepageUrl: 'https://bukuwarung.com/',
  officialCareersHandoffUrl: 'https://bukuwarung.darwinbox.com/ms/candidate/careers',
  darwinboxJobsUrl: 'https://bukuwarung.darwinbox.com/jobs',
  darwinboxShellRouteUrls: [
    'https://bukuwarung.darwinbox.com/ms/candidate/careers',
    'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home',
    'https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/allJobs',
  ],
  darwinboxListingApiUrl: 'https://bukuwarung.darwinbox.com/ms/candidateapi/job/alljobs?companyId=main',
  companyDomain: 'bukuwarung.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-darwinbox-blank-shell-and-cloudflare-api-validation',
  extractionStrategy:
    'verified-official-careers-page+verified-darwinbox-handoff+verified-blank-public-shells+verified-cloudflare-blocked-listing-api-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://bukuwarung.com/ redirects to the live first-party homepage at https://www.bukuwarung.com/, that the official Karir route is https://www.bukuwarung.com/career/, and that this first-party careers page links See Open Positions directly to https://bukuwarung.darwinbox.com/ms/candidate/careers. On the linked Darwinbox tenant, https://bukuwarung.darwinbox.com/jobs resolves to https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home, while https://bukuwarung.darwinbox.com/ms/candidate/careers, https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/home, and https://bukuwarung.darwinbox.com/ms/candidatev2/main/careers/allJobs each returned only a minimal blank shell titled Bukuwarung. The public candidate jobs API at https://bukuwarung.darwinbox.com/ms/candidateapi/job/alljobs?companyId=main returned a Cloudflare 403 blocked page during live verification, so there is no trustworthy public jobs surface for Bukuwarung on the verified date.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default BOOKUWARUNG_CATALOG
