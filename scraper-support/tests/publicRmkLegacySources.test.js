import test from 'node:test';import assert from 'node:assert/strict';
import {readNativeListing,readNativePosting,createPublishedRmkScraper} from '../native-sources/publicRmkRoleSources.js';
import * as lupin from '../../scraper/lupin/script.js';import * as volvo from '../../scraper/volvo/script.js';
import {fixture,CLOCK,profiles,originalHTML,originalOptions,model,listing} from './helpers/lupinVolvoOriginalFixture.js';
test('Lupin native table follows all three published global ranges without changing query scope',()=>{
 let prior;const all=[];for(const url of fixture.expected.lupin.listingURLs){const page=readNativeListing(originalHTML(url),url,prior,profiles.lupin);prior=page.model;all.push(...page.rows)}assert.equal(all.length,66);assert.equal(new Set(all.map(r=>r.jobId)).size,66);assert.ok(all.some(r=>r.jobId==='1435811300'));
});
test('Lupin public detail helper retains full original criteria without invented requisition or qualification ranking',()=>{
 const row=listing('lupin','1416479500'),value=lupin.extractJobDetail(originalHTML(row.sourceUrl),row,CLOCK);
 assert.equal(value.jobId,'1416479500');assert.equal(value.requisitionId,null);assert.equal(value.internalJobId,null);assert.match(value.jobDescription,/5 to 10 years/);assert.match(value.jobDescription,/Masters in Pharmacy/);assert.match(value.jobDescription,/Graduation in Pharmacy/);assert.equal(value.minimumQualification,null);assert.equal(value.preferredQualification,null);
});
test('classic native model with no Job ID still proves its public application identity and retains unranked Education',()=>{
 const row=listing('lupin','1416479500'),value=readNativePosting(originalHTML(row.sourceUrl),row,CLOCK,profiles.lupin);
 assert.equal(value.internalJobId,null);assert.equal(value.requisitionId,null);assert.equal(value.sourceNativeJobID,null);assert.equal(value.sourceNativeDetailQualified,true);assert.equal(value.country,'India');assert.equal(value.postingDate,'2026-11-01T08:00:00.000Z');assert.equal(value.closingDate,'2026-11-29T18:30:00.000Z');assert.match(value.educationRequirements,/Masters in Pharmacy/);assert.match(value.educationRequirements,/Graduation in Pharmacy/);assert.equal(value.preferredQualification,null);assert.equal(value.employmentType,null);assert.equal(value.sourceEmploymentTypeUnresolved,true);assert.equal(value.sourceRemoteStatusUnresolved,true);
});
test('all four publisher-empty Lupin templates remain retained and unqualified',()=>{
 for(const id of ['1445251000','1445252700','1445253200','1446262900']){const row=listing('lupin',id),value=readNativePosting(originalHTML(row.sourceUrl),row,CLOCK,profiles.lupin);assert.equal(value.sourceNativeDetailQualified,false);assert.equal(value.sourceNativeCriteriaMissing,true);assert.ok(value.sourceNativePostingHTML);assert.equal(value.country,'India');assert.equal(value.sourceScopeComplete,false)}
});
test('Lupin literal locality containing its region does not create a false worksite conflict',()=>{
 const row=listing('lupin','1435811300'),value=readNativePosting(originalHTML(row.sourceUrl),row,CLOCK,profiles.lupin);assert.equal(value.sourceNativeDetailQualified,true);assert.equal(value.sourceNativeLocationConflict,false);assert.equal(value.city,'Bridgewater, NJ');assert.equal(value.state,'NJ');assert.equal(value.country,'United States');assert.equal(value.sourceIndiaWorksiteQualified,false);
});
test('Volvo native Organization column is retained without replacing the employer',()=>{
 const page=readNativeListing(originalHTML(profiles.volvo.searchURL),profiles.volvo.searchURL,undefined,profiles.volvo);assert.equal(page.rows.length,35);assert.equal(page.reportedTotal,35);assert.ok(page.rows.every(r=>r.nativeEmployer===null));assert.ok(page.rows.some(r=>r.nativeOrganization));
});
test('Volvo explicit requisition, organization, category and position/contract types remain distinct',()=>{
 const row=listing('volvo','1364493055'),value=readNativePosting(originalHTML(row.sourceUrl),row,CLOCK,profiles.volvo);assert.equal(value.jobId,'1364493055');assert.equal(value.requisitionId,'34242');assert.equal(value.internalJobId,null);assert.equal(value.sourceNativeJobID,null);assert.equal(value.sourceNativeOrganization,'Group Finance');assert.equal(value.sourceNativeJobCategory,'Finance');assert.equal(value.jobCategory,'Finance');assert.equal(value.sourceNativePositionType,'Professional');assert.equal(value.sourceNativeContractType,'Temporary');assert.equal(value.employmentType,null);assert.equal(value.sourceEmploymentType,null);assert.equal(value.remoteStatus,null);assert.equal(value.sourceRemoteStatusUnresolved,true);assert.equal(value.sourceNativeDetailQualified,true);
});
test('both actual Volvo mixed-country models retain every native site and qualify verified India',()=>{
 for(const id of fixture.expected.volvo.mixedCountryIDs){const row=listing('volvo',id),value=readNativePosting(originalHTML(row.sourceUrl),row,CLOCK,profiles.volvo);assert.equal(value.sourceNativeDetailQualified,true);assert.equal(value.country,'India');assert.equal(value.sourceIndiaWorksiteQualified,true);assert.deepEqual(value.sourceNativeLocationLabels,model('volvo',id).locationLabels);assert.ok(value.sourceNativeWorksites.some(v=>v.countryCode!=='IN'));assert.match(value.locations[0],/\bIN\b/)}
});
test('the configured native Volvo HTML inventory covers every RSS India job and recovers eighteen extra',async()=>{
 assert.equal(fixture.reconciliation.allObservedRSSIndiaIDsCoveredByMainSearch,true);assert.equal(fixture.reconciliation.mainNewIDsBeyondRSS.length,18);
 const options=originalOptions('volvo'),jobs=await volvo.run(options);assert.equal(jobs.length,35);assert.deepEqual([...new Set(jobs.map(j=>j.jobId))].sort(),[...fixture.expected.volvo.indiaCandidateIDs].sort());assert.equal(options.audits.length,1);assert.equal(options.audits[0].observations.length,35);assert.ok(options.requests.includes(profiles.volvo.searchURL));
});
test('Lupin cap0 still reads all global own models and retains the twenty foreign and four empty cases',async()=>{
 const options=originalOptions('lupin'),jobs=await lupin.createLupinScraper({maxJobs:0}).run(options);assert.deepEqual(jobs,[]);assert.equal(options.audits.length,1);const audit=options.audits[0];assert.equal(audit.observations.length,66);assert.equal(audit.observations.filter(v=>v.sourceNativeDetailQualified).length,62);assert.equal(audit.nativeCandidateCount,42);assert.equal(options.records[0].length,66);for(const url of fixture.expected.lupin.ownURLs)assert.ok(options.requests.includes(url));
});
test('shared source runner emits only the forty-two genuine Lupin India criteria models after all own reads',async()=>{
 const options=originalOptions('lupin'),jobs=await createPublishedRmkScraper(profiles.lupin).run(options);assert.equal(jobs.length,42);assert.deepEqual(jobs.map(j=>j.jobId).sort(),[...fixture.expected.lupin.indiaCandidateIDs].sort());assert.equal(options.records[0].length,66);assert.equal(options.audits[0].sourceScopeComplete,false);assert.equal(options.audits[0].lifecycleCleanupAllowed,false);
});

test('classic region-only native display retains the typed Mexico locality without inventing India',()=>{
 for(const id of ['1441586600','1441586700']){const row=listing('lupin',id),html=originalHTML(row.sourceUrl),value=readNativePosting(html,row,CLOCK,profiles.lupin);assert.equal(value.sourceNativeDetailQualified,true);assert.equal(value.city,'Kin Mex');assert.equal(value.state,'MEX');assert.equal(value.country,'Mexico');assert.equal(value.sourceIndiaWorksiteQualified,false);const changed=html.replaceAll('MEX, MX','MEX, IN'),changedRow={...row,nativeLocations:['MEX, IN']},negative=readNativePosting(changed,changedRow,CLOCK,profiles.lupin);assert.equal(negative.sourceNativeDetailQualified,false);assert.equal(negative.sourceIndiaWorksiteQualified,false)}
});
