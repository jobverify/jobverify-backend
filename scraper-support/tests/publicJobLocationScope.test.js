import assert from 'node:assert/strict'
import test from 'node:test'

import { filterIndiaJobs } from '../utils/indiaLocationFilter.js'
import {
  getValidIndiaCityForJob,
  isJobInPublicLocationScope,
} from '../../src/utils/publicJobLocationScope.js'

test('public job location scope rejects United States remote jobs while keeping India remote jobs', () => {
  const usRemoteJob = {
    title: 'Remote Virtual Care Physician (W2) | Asynchronous',
    location: 'Remote, United States',
    city: 'Remote',
    country: 'United States',
  }
  const indiaRemoteJob = {
    title: 'Platform Engineer',
    location: 'Remote, India',
    city: 'Remote',
    country: 'India',
  }
  const explicitIndiaCountryRemoteJob = {
    title: 'Remote Support Specialist',
    location: 'Remote',
    city: 'Remote',
    country: 'India',
  }

  assert.equal(getValidIndiaCityForJob(usRemoteJob), null)
  assert.equal(isJobInPublicLocationScope(usRemoteJob), false)

  assert.equal(getValidIndiaCityForJob(indiaRemoteJob), 'Remote')
  assert.equal(isJobInPublicLocationScope(indiaRemoteJob), true)

  assert.equal(getValidIndiaCityForJob(explicitIndiaCountryRemoteJob), 'Remote')
  assert.equal(isJobInPublicLocationScope(explicitIndiaCountryRemoteJob), true)

  assert.deepEqual(
    filterIndiaJobs([usRemoteJob, indiaRemoteJob, explicitIndiaCountryRemoteJob]).map((job) => job.title),
    ['Platform Engineer', 'Remote Support Specialist'],
  )
})
