import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const PROVIDER_METADATA = { ...{
  "source": "burohappold",
  "companyName": "Buro Happold",
  "adapter": "script",
  "modulePath": "../burohappold.workday/script.js",
  "dryRunFile": "burohappold.workday/jobs.json",
  "catalogOverride": true,
  "atsPlatform": "first-party-buro-happold-native-html",
  "parser": "native-html-jobposting",
  "normalizationProfile": "engineering-default",
  "countryFilter": "India",
  "paginationStrategy": "native-unfiltered-GET-next-links;all-advertised-pages;closing-board-check",
  "extractionStrategy": "native-role-ID-and-visible-job-reference;full-visible-and-JobPosting-description;typed-country",
  "companyDomain": "burohappold.com",
  "officialHomepageUrl": "https://www.burohappold.com/careers/",
  "companyCareerPage": "https://vacancies.burohappold.com/",
  "jobsBoardUrl": "https://vacancies.burohappold.com/",
  "verifiedOn": null,
  "verifiedAt": null,
  "verifiedPublicJobCount": null,
  "verifiedIndiaJobCount": null,
  "verificationDisposition": "implemented-offline-runtime-unverified",
  "verifiedInventoryStatus": "unverified",
  "zeroResultPolicy": "coverage-gap",
  "remediationStatus": "implemented-offline-runtime-validation-pending",
  "runtimeQualification": "unqualified-offline-fixture-port-only",
  "backfillMode": "live-parser",
  "originalModulePath": "../workbookbatch10b/failClosedSentinel.js",
  "sourceScopeComplete": false,
  "lifecycleCleanupAllowed": false,
  "sourceObservedFirstPageCards": 10,
  "sourceObservedAdvertisedLastPage": 24,
  "sourceObservedReportedTotal": null,
  "sourceRetainedFullIndiaDetails": 1,
  "sourceNativeObservationCompletedAt": "2026-10-21T00:57:07.069Z",
  "sourceNativeDetailObservationCompletedAt": "2026-10-21T01:03:22.545Z",
  "verifiedSurfaceSummary": "Three retained native HTTP response-text captures document the corporate vacancy handoff, ten first-page cards behind 24 advertised pages, and one complete Bengaluru role2633. The exact vacancy total and later23 page inventories are unknown. Native URL ID agrees with visible job reference; full visible and schema descriptions agree apart from paragraph whitespace. Native publication19October and expiry31December have day precision. No current extraction, persistence or public visibility qualification is claimed.",
  "bindingEvidence": {
    "verified": false,
    "officialBrandHandoffDocumented": true,
    "officialURL": "https://www.burohappold.com/careers/",
    "advertisedVacancyPortal": "https://vacancies.burohappold.com/",
    "nativeHiringOrganizationLabel": "Buro Happold Limited",
    "wholeEmployerInventoryEquivalent": false,
    "aliasesCreated": false,
    "applicationsOpened": false
  },
  "sourceScopeNotes": "Native Buro Happold Limited employer label is preserved separately from registered brand and unknown legal-employer qualification. Role2633 has explicit addressCountry India, addressLocality Bengaluru and postal560038; no state is invented. Native careershub application href is retained without visiting any member/login/application form. GET page links are followed; POST search/send forms are never submitted. An observed partial card count is not substituted for an unadvertised exact inventory total. The historical folder name is retained for compatibility; execution uses the native HTML portal."
}, modulePath: path.join(dir, 'script.js'), dryRunFile: path.join(dir, 'jobs.json') };
export default PROVIDER_METADATA;
export { PROVIDER_METADATA };
