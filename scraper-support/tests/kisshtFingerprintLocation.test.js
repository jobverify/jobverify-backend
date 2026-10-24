import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Job from '../../src/models/Job.js'
import {generateFingerprint,saveToDB} from '../utils/saveToDB.js'
const old={source:'kissht',company:'Kissht',title:'Branch Manager',requisitionId:'SiCrevaC3050',jobId:'3050',location:'Bangalore, Karnataka, India',city:'Bangalore',country:'India',applyUrl:'https://app1596.workline.hr/Candidate/SignInv1.aspx?PRFCode=00000000-0000-0000-0000-000000000001&Flag=C&DirectApply=1',sourceListingComplete:false}
const corrected={...old,city:'Mysore',location:'Mysore, Karnataka, India',fingerprintLocation:old.location}
test('Kissht work-location corrections retain their previous fingerprint',()=>{assert.equal(generateFingerprint(corrected),generateFingerprint(old));assert.equal(new Job(corrected).fingerprintLocation,old.location)})
test('fingerprint location does not alter identity for other employers or sources',()=>{for(const edit of [{company:'Other'},{source:'other'}]){const r={...corrected,...edit};assert.equal(generateFingerprint(r),generateFingerprint({...r,fingerprintLocation:undefined}))}})
test('Kissht persists the stable fingerprint location while updating displayed workplace',async t=>{
 const descriptor=Object.getOwnPropertyDescriptor(mongoose.connection,'readyState');Object.defineProperty(mongoose.connection,'readyState',{configurable:true,value:1});let ops
 t.mock.method(Job,'bulkWrite',async operations=>{ops=operations;return{upsertedCount:0,modifiedCount:1}})
 try{await saveToDB([corrected],'kissht',{replaceExisting:false,enrichPublicExperience:false,enqueueAlerts:false,refreshDatasetSummary:false});assert.equal(ops.length,1);assert.equal(ops[0].updateOne.filter.fingerprint,generateFingerprint(old));assert.equal(ops[0].updateOne.update.$set.fingerprintLocation,old.location);assert.equal(ops[0].updateOne.update.$set.city,'Mysuru')}
 finally{if(descriptor)Object.defineProperty(mongoose.connection,'readyState',descriptor);else delete mongoose.connection.readyState}
})
