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

test('public job location scope keeps explicitly Indian jobs whose cities are outside the UI allowlist', () => {
  const jobs = [
    { title: 'Dehradun role', city: 'Dehradun', location: 'Dehradun', country: 'India' },
    { title: 'Kanpur role', city: 'Kanpur', location: 'Kanpur, Uttar Pradesh', country: 'IN' },
    { title: 'Kohima role', location: 'Kohima, India', country: 'IND' },
  ]

  assert.deepEqual(
    jobs.map((job) => getValidIndiaCityForJob(job)),
    ['Dehradun', 'Kanpur', 'Kohima'],
  )
  assert.ok(jobs.every((job) => isJobInPublicLocationScope(job)))
  assert.deepEqual(
    filterIndiaJobs(jobs).map((job) => job.title),
    ['Dehradun role', 'Kanpur role', 'Kohima role'],
  )
})

test('an explicit non-India country takes precedence over an allowlisted Indian city', () => {
  const job = {
    title: 'Mislabeled Bangalore role',
    city: 'Bangalore',
    location: 'Bangalore',
    country: 'United States',
  }

  assert.equal(getValidIndiaCityForJob(job), null)
  assert.equal(isJobInPublicLocationScope(job), false)
})
