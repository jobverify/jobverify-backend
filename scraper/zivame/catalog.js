import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "zivame",
  "companyName": "Zivame",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "companyCareerPage": "https://www.zivame.com/careers",
  "blockedLegacyCareerPageUrl": "https://careers.zivame.com/",
  "companyDomain": "zivame.com",
  "atsPlatform": "official-company-careers-blocked-by-cloudflare",
  "countryFilter": "India",
  "paginationStrategy": "verified-live-homepage-plus-blocked-careers-route-and-dead-legacy-host",
  "extractionStrategy": "verified-first-party-homepage+verified-cloudflare-blocked-careers-route+verified-dead-legacy-careers-host-return-empty",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-08-04",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Tuesday, August 4, 2026 that https://www.zivame.com/ is the live first-party Zivame homepage, that its footer still links candidates to https://www.zivame.com/careers, that direct fetches to that official careers route currently return an HTTP 403 Cloudflare challenge page titled Just a moment..., and that the legacy careers host at https://careers.zivame.com/ now fails DNS resolution. Because the current official careers route is blocked in this environment and the older careers subdomain is dead, this provider remains a fail-closed sentinel that returns no jobs until a trustworthy public jobs surface is re-verified.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-same-origin-detail-pages",
  "originalModulePath": "../workbookbatch02/zivame.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch02\\zivame.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
