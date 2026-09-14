import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SURYALOGIX_CATALOG = {
  "source": "suryalogix",
  "companyName": "SuryaLogix",
  "adapter": "script",
  "companyCareerPage": "https://suryalogix.com/career-opportunities/",
  "atsPlatform": "first-party-inline-walk-in-openings",
  "countryFilter": "India",
  "paginationStrategy": "complete-inline-opening-count-and-event-deadline",
  "extractionStrategy": "verified-first-party-homepage+careers-inline-openings+explicit-india-location+walk-in-deadline",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "companyDomain": "suryalogix.com",
  "verifiedOn": "2026-09-13",
  "verifiedPublicJobCount": 3,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified September 13, 2026: the official SuryaLogix career-opportunities page publishes three Pune, Maharashtra inline roles under Walk-In Interviews, dated September 8 to 12, 2026, 11:00 am to 5:00 pm IST. All three parsed cards are expired, so the complete active India inventory is zero. Generic application forms, malformed cards, unknown dates and new unparsed hiring handoffs fail closed.",
  modulePath: path.join(currentDir, 'script.js'),
}

export default SURYALOGIX_CATALOG
