/**
 * @file Tests for job query location filtering and scoping controllers.
 * @module test/jobControllerLocationScope
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'

import Job from '../src/models/Job.js'
import { ACCESS_ROLES, PLAN_IDS } from '../src/constants/accessPlans.js'
import {
  getAllJobs,
  getJobById,
  getJobMeta,
  getJobStats,
} from '../src/controllers/jobController.js'
import {
  applyPublicJobLocationScope,
  buildPublicJobLocationScope,
  getValidIndiaCityForJob,
  isJobInPublicLocationScope,
} from '../src/utils/publicJobLocationScope.js'

// Creates a mock response object for controller tests.
const createResponseDouble = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  set(name, value) {
    this.headers[name] = value
    return this
  },
  status(code) {
    this.statusCode = code
    return this
  },
  json(payload) {
    this.body = payload
    return this
  },
})

test('getValidIndiaCityForJob keeps city-only India jobs outside the legacy city allowlist', () => {
  const job = {
    city: 'Noida',
    location: 'Noida',
  }

  assert.equal(getValidIndiaCityForJob(job), 'Noida')
  assert.equal(isJobInPublicLocationScope(job), true)
})

test('getValidIndiaCityForJob keeps researched India cities without an explicit country marker', () => {
  const job = {
    city: 'Faridabad',
    location: 'Faridabad',
  }

  assert.equal(getValidIndiaCityForJob(job), 'Faridabad')
  assert.equal(isJobInPublicLocationScope(job), true)
})

test('getValidIndiaCityForJob keeps plain remote jobs in scope', () => {
  const job = {
    city: 'Remote',
    location: 'Remote',
  }

  assert.equal(getValidIndiaCityForJob(job), 'Remote')
  assert.equal(isJobInPublicLocationScope(job), true)
})

test('getValidIndiaCityForJob rejects foreign cities when the country field is mislabeled as India', () => {
  const job = {
    country: 'India',
    city: 'Austin',
    location: 'Austin, Texas, United States of America',
  }

  assert.equal(getValidIndiaCityForJob(job), null)
  assert.equal(isJobInPublicLocationScope(job), false)
})

test('buildPublicJobLocationScope relies on stored city and location fields', () => {
  const scope = buildPublicJobLocationScope()

  assert.equal(Array.isArray(scope.$or), true)
  assert.deepEqual(
    scope.$or.map((clause) => Object.keys(clause)[0]).sort(),
    ['city', 'location', 'locations'],
  )
})

// Verifies that the public location scope is applied to job search queries.
test('getAllJobs applies the public location scope to the jobs query', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  let countFilter = null
  let findFilter = null

  Job.countDocuments = async (filter) => {
    countFilter = filter
    return 1
  }
  Job.distinct = async () => ['Example Corp']

  Job.find = (filter) => {
    findFilter = filter

    return {
      select() {
        return this
      },
      sort() {
        return this
      },
      skip() {
        return this
      },
      limit() {
        return this
      },
      lean() {
        return this
      },
      exec: async () => [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Software Engineer',
          city: 'Bangalore',
          location: 'Bengaluru, India',
        },
      ],
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({ query: {}, user: null }, res)

    const expectedFilter = applyPublicJobLocationScope({ status: 'active' })
    assert.deepEqual(countFilter, expectedFilter)
    assert.deepEqual(findFilter, expectedFilter)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.data.length, 1)
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

// Verifies that raw full-time records are classified before being returned publicly.
test('getAllJobs classifies raw full-time jobs before returning them', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  Job.countDocuments = async () => 1
  Job.distinct = async () => ['Example Corp']
  Job.find = () => ({
    select() {
      return this
    },
    sort() {
      return this
    },
    skip() {
      return this
    },
    limit() {
      return this
    },
    lean() {
      return this
    },
    exec: async () => [
      {
        _id: new mongoose.Types.ObjectId().toString(),
        title: 'Graduate Software Engineer',
        company: 'Example Corp',
        jobType: 'Full-time',
        employmentType: 'Full-time',
        experienceRequired: '0-1 years of experience',
        description: 'Campus hiring role for 2026 graduates.',
      },
    ],
  })

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: {},
      user: {
        role: 'user',
        accessRole: ACCESS_ROLES.MONTHLY,
        premium: {
          planId: PLAN_IDS.MONTHLY,
          status: 'active',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    }, res)

    assert.equal(res.statusCode, 200)
    assert.equal(res.body.data[0].jobType, 'Full-time Fresher')
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

// Verifies that chronological sorting is applied correctly when requested.
test('getAllJobs applies oldest chronological sorting when requested', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  let capturedSort = null

  Job.countDocuments = async () => 0
  Job.distinct = async () => []
  Job.find = () => ({
    select() {
      return this
    },
    sort(sortArg) {
      capturedSort = sortArg
      return this
    },
    skip() {
      return this
    },
    limit() {
      return this
    },
    lean() {
      return this
    },
    exec: async () => [],
  })

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: { sort: 'oldest' },
      user: {
        role: 'user',
        accessRole: ACCESS_ROLES.MONTHLY,
        premium: {
          planId: PLAN_IDS.MONTHLY,
          status: 'active',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      },
    }, res)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(capturedSort, { postedAt: 1, createdAt: 1, _id: 1 })
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

// Verifies that the public location scope is applied to the job detail query.
test('getJobById applies the public location scope to the detail query', async () => {
  const originalFindOne = Job.findOne
  const jobId = new mongoose.Types.ObjectId().toString()
  let capturedFilter = null

  Job.findOne = async (filter) => {
    capturedFilter = filter
    return null
  }

  try {
    const res = createResponseDouble()

    await getJobById({ params: { id: jobId } }, res)

    assert.deepEqual(
      capturedFilter,
      applyPublicJobLocationScope({ _id: jobId, status: 'active' }),
    )
    assert.equal(res.statusCode, 404)
  } finally {
    Job.findOne = originalFindOne
  }
})

// Verifies that raw full-time detail records are classified before being returned publicly.
test('getJobById classifies raw full-time jobs before returning them', async () => {
  const originalFindOne = Job.findOne
  const jobId = new mongoose.Types.ObjectId().toString()

  Job.findOne = async () => ({
    _id: jobId,
    title: 'Software Engineer',
    company: 'Example Corp',
    jobType: 'Full-time',
    employmentType: 'Full-time',
    experienceRequired: '3 to 5 years of software engineering experience',
    description: 'Build internal tooling for engineering systems.',
  })

  try {
    const res = createResponseDouble()

    await getJobById({ params: { id: jobId } }, res)

    assert.equal(res.statusCode, 200)
    assert.equal(res.body.data.jobType, 'Full-time Experienced')
  } finally {
    Job.findOne = originalFindOne
  }
})

test('getJobById corrects stale fresher labels when explicit experience shows an experienced role', async () => {
  const originalFindOne = Job.findOne
  const jobId = new mongoose.Types.ObjectId().toString()

  Job.findOne = async () => ({
    _id: jobId,
    title: 'Cloud DevOps Engineer',
    company: 'Airbus',
    jobType: 'Full-time Fresher',
    employmentType: 'Full-time',
    experienceLevel: 'Entry Level',
    experienceRequired: 'Experience: Graduate with 3-7 years of experience in Cloud Platform and DevOps development',
    experienceProfile: {
      minimumYears: 3,
      maximumYears: 7,
      confidence: 'high',
    },
    description: 'Support cloud platform and DevOps operations for Airbus teams.',
  })

  try {
    const res = createResponseDouble()

    await getJobById({ params: { id: jobId } }, res)

    assert.equal(res.statusCode, 200)
    assert.equal(res.body.data.experienceLevel, 'Mid Level')
    assert.equal(res.body.data.jobType, 'Full-time Experienced')
  } finally {
    Job.findOne = originalFindOne
  }
})

test('getJobById flags Workday applications that currently redirect to a maintenance page', async () => {
  const originalFindOne = Job.findOne
  const originalFetch = global.fetch
  const jobId = new mongoose.Types.ObjectId().toString()
  const workdayJobUrl = 'https://allstate.wd5.myworkdayjobs.com/en-US/allstate_careers/job/Ind--Blr-Sez-1-3Rd-6Th--7Th-Floor/Full-Stack-Developer-Consultant-I-Consultant-II_R30908'

  Job.findOne = async () => ({
    _id: jobId,
    title: 'Software Engineer Consultant II',
    company: 'Allstate',
    jobType: 'Full-time Experienced',
    applyUrl: workdayJobUrl,
    sourceUrl: workdayJobUrl,
    atsPlatform: 'workday',
  })

  global.fetch = async () => ({
    url: 'https://community.workday.com/maintenance-page?d=5&s=1&e=1&o=',
    text: async () => '<html><head><title>Workday is currently unavailable.</title></head><body>maintenance-page</body></html>',
  })

  try {
    const res = createResponseDouble()

    await getJobById({ params: { id: jobId } }, res)

    assert.equal(res.statusCode, 200)
    assert.equal(res.body.data.applicationUrl, workdayJobUrl)
    assert.equal(res.body.data.applicationStatus, 'temporarily_unavailable')
    assert.match(
      res.body.data.applicationStatusReason,
      /workday.+temporarily unavailable/i,
    )
  } finally {
    Job.findOne = originalFindOne
    global.fetch = originalFetch
  }
})

// Verifies that the public location scope is applied to all metadata queries.
test('getJobMeta applies the public location scope to metadata queries', async () => {
  const originalDistinct = Job.distinct
  const capturedFilters = []

  // Mocks Job.distinct to capture the filters applied.
  Job.distinct = async (_field, filter) => {
    capturedFilters.push(filter)
    return []
  }

  try {
    const res = createResponseDouble()

    await getJobMeta({}, res)

    const expectedFilter = applyPublicJobLocationScope({ status: 'active' })
    assert.equal(capturedFilters.length, 3)
    assert.deepEqual(capturedFilters[0], expectedFilter)
    assert.deepEqual(
      capturedFilters[1],
      applyPublicJobLocationScope({ status: 'active', city: { $ne: null } }),
    )
    assert.deepEqual(
      capturedFilters[2],
      applyPublicJobLocationScope({ status: 'active', jobType: { $ne: null } }),
    )
    assert.equal(res.statusCode, 200)
  } finally {
    Job.distinct = originalDistinct
  }
})

test('getJobMeta omits unsupported part-time job types from metadata responses', async () => {
  const originalDistinct = Job.distinct

  Job.distinct = async (field) => {
    if (field === 'company') return ['Example Corp']
    if (field === 'city') return ['Bangalore']
    if (field === 'jobType') return ['Part-time', 'Contract', 'Full-time']
    return []
  }

  try {
    const res = createResponseDouble()

    await getJobMeta({}, res)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.data.jobTypes, ['Contract', 'Full-time Experienced'])
  } finally {
    Job.distinct = originalDistinct
  }
})

// Verifies that the public location scope is applied to database stats queries.
test('getJobStats applies the public location scope to the counts query', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  let countFilter = null
  let distinctFilter = null

  Job.countDocuments = async (filter) => {
    countFilter = filter
    return 14
  }

  Job.distinct = async (_field, filter) => {
    distinctFilter = filter
    return ['Example']
  }

  try {
    const res = createResponseDouble()

    await getJobStats({}, res)

    const expectedFilter = applyPublicJobLocationScope({ status: 'active' })
    assert.deepEqual(countFilter, expectedFilter)
    assert.deepEqual(distinctFilter, expectedFilter)
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.data.totalJobs, 14)
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
  }
})
