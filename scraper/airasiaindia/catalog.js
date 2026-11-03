import path from'node:path'
import{fileURLToPath}from'node:url'
const currentDir=path.dirname(fileURLToPath(import.meta.url))
export const AIRASIA_INDIA_CATALOG={
 source:'airasiaindia',companyName:'Air India Express',legacyCompanyName:'AirAsia India',officialBrandName:'Air India Express',
 adapter:'script',companyCareerPage:'https://www.airindiaexpress.com/careers',companyDomain:'airindiaexpress.com',
 atsPlatform:'successfactors-aix-public-brand',countryFilter:'India',
 paginationStrategy:'corporate-AEM-model+declared-AIX-brand+unfiltered-native-zero+closing',
 extractionStrategy:'verified-legal-successor+current-corporate-declared-AIX-brand+two-explicit-native-zero-reads',
 parser:'custom-script',normalizationProfile:'engineering-default',historicalContinuityURL:'https://www.airindia.com/in/en/newsroom/press-release/air-india-express-aix-connect-merger.html',
 historicalContinuityPublishedOn:'2024-10-01',currentHiringBrand:'aix',nativeBoardURL:'https://careers.airindia.com/aix',
 relatedRegisteredSource:'airindia',sourceCompanyWideScopeComplete:false,lifecycleCleanupAllowed:false,
 verifiedOn:null,verifiedAt:null,verifiedPublicJobCount:null,verifiedIndiaJobCount:null,zeroResultPolicy:'evidence-required',
 verifiedSurfaceSummary:'The official legal merger statement identifies AIX Connect (erstwhile AirAsia India) as merged into Air India Express. Current Air India Express corporate AEM careers model declares the exact AIX brand board. Runtime validates that handoff, company/brand token, unfiltered blank native search, explicit no-open-positions and0fallback count in opening/closing reads. This qualifies only the current declared AIX public board, not whole-company absence or lifecycle cleanup. The separate Air India source/airline is not a legal alias. Future positive native input is held until full current public role collection is qualified.',
 modulePath:path.join(currentDir,'script.js')
}
export default AIRASIA_INDIA_CATALOG
