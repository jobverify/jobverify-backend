import path from 'node:path'
import {fileURLToPath} from 'node:url'
const currentDir=path.dirname(fileURLToPath(import.meta.url))
export default {
 source:'amberstudent',companyName:'Amberstudent',adapter:'script',modulePath:path.join(currentDir,'script.js'),
 companyCareerPage:'https://amberstudent.com/career',companyDomain:'amberstudent.com',countryFilter:'India',
 officialJobsBoardUrl:'https://amberstudent.keka.com/careers/',atsPlatform:'keka',
 paginationStrategy:'complete-public-keka-active-inventory',
 extractionStrategy:'verified-first-party-jobs-route+public-bundle-keka-handoff+explicit-india-positives',
 verifiedOn:'2026-09-13',verifiedPublicJobCount:20,verifiedIndiaJobCount:15,
 verifiedSurfaceSummary:'Verified on September 13, 2026 that Amber careers links /job-opening, whose public jobs bundle embeds the amberstudent.keka.com tenant. The complete public active feed exposes 20 roles, 15 with explicit India locations and five without geography. Only confirmed India jobs are imported; sourceListingComplete:false prevents lifecycle reconciliation while any geography is unknown. The retired SmartRecruiters board is no longer the official handoff.',
 kekaIdentifier:'228f83f5-48b3-474a-b753-4fce2be7524f',
 kekaJobsApiUrl:'https://amberstudent.keka.com/careers/api/embedjobs/default/active/228f83f5-48b3-474a-b753-4fce2be7524f',
}
