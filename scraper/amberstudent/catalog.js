import path from 'node:path'
import {fileURLToPath} from 'node:url'
const currentDir=path.dirname(fileURLToPath(import.meta.url))
export default {
 source:'amberstudent',companyName:'Amberstudent',adapter:'script',modulePath:path.join(currentDir,'script.js'),
 companyCareerPage:'https://amberstudent.com/career',companyDomain:'amberstudent.com',countryFilter:'India',
 officialJobsBoardUrl:'https://amberstudent.keka.com/careers/',atsPlatform:'keka',
 paginationStrategy:'complete-public-keka-active-inventory',
 extractionStrategy:'verified-first-party-jobs-route+public-bundle-keka-handoff+explicit-india-positives',
 verifiedOn:'2026-10-03',verifiedPublicJobCount:23,verifiedIndiaJobCount:18,
 verifiedSurfaceSummary:'Verified on October 3, 2026 that Amber careers links /job-opening, whose current public jobs bundle binds the amberstudent.keka.com tenant and active jobs endpoint. The feed exposes 23 roles, 18 with explicit India locations and five without geography. Only confirmed India jobs are imported; sourceListingComplete:false prevents lifecycle reconciliation while any geography is unknown.',
 kekaIdentifier:'228f83f5-48b3-474a-b753-4fce2be7524f',
 kekaJobsApiUrl:'https://amberstudent.keka.com/careers/api/embedjobs/default/active/228f83f5-48b3-474a-b753-4fce2be7524f',
}
