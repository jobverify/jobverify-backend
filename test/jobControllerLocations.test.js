/**
 * @file Tests for job controller location matching and option merging.
 * @module test/jobControllerLocations
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import Job from '../src/models/Job.js'
import JobDatasetSummary from '../src/models/JobDatasetSummary.js'
import { ACCESS_ROLES, PLAN_IDS } from '../src/constants/accessPlans.js'
import {
  getAllJobs,
  getJobMeta,
  normalizeJobListResponseJob,
} from '../src/controllers/jobController.js'

// Creates a mock response object for controller tests.
const createResponseDouble = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code
    return this
  },
  json(payload) {
    this.body = payload
    return this
  },
  set() {
    return this
  },
})

const createSummaryFindOneStub = (summary) => () => ({
  lean() {
    return this
  },
  exec: async () => summary,
})

const createAggregateExecStub = (handler) => (pipeline) => ({
  exec: async () => handler(pipeline),
})

const getCoreFilter = (filter) => {
  if (!filter || typeof filter !== 'object') return {}

  const keys = Object.keys(filter)
  if (keys.some((key) => key !== '$and')) {
    return filter
  }

  return Array.isArray(filter.$and) ? filter.$and[0] ?? {} : filter
}

const collectExperienceYearsFilters = (node) => {
  if (!node || typeof node !== 'object' || node instanceof RegExp) return []

  const matches = []
  if (Array.isArray(node.experienceYears?.$in)) {
    matches.push(node.experienceYears.$in)
  }

  for (const key of ['$and', '$or']) {
    if (Array.isArray(node[key])) {
      for (const child of node[key]) {
        matches.push(...collectExperienceYearsFilters(child))
      }
    }
  }

  return matches
}

const hasExperienceYearsFilter = (filter, expectedYears) => (
  collectExperienceYearsFilters(filter)
    .some((years) => (
      years.length === expectedYears.length
      && years.every((year, index) => year === expectedYears[index])
    ))
)

const matchesExperienceRequiredCondition = (job, condition) => {
  if (!Object.hasOwn(condition ?? {}, 'experienceRequired')) return true
  const rule = condition.experienceRequired

  if (rule?.$exists === false) {
    return !Object.hasOwn(job, 'experienceRequired')
  }

  if (rule === null) {
    return job.experienceRequired == null
  }

  if (rule === '') {
    return job.experienceRequired === ''
  }

  if (rule?.$not instanceof RegExp) {
    return !rule.$not.test(job.experienceRequired || '')
  }

  if (rule?.$regex instanceof RegExp) {
    return rule.$regex.test(job.experienceRequired || '')
  }

  return job.experienceRequired === rule
}

const matchesExperienceYearsCondition = (job, condition) => {
  if (!Object.hasOwn(condition ?? {}, 'experienceYears')) return true
  const rule = condition.experienceYears

  if (rule?.$exists === false) {
    return !Object.hasOwn(job, 'experienceYears')
  }

  if (rule === null) {
    return job.experienceYears == null
  }

  if (rule?.$size === 0) {
    return Array.isArray(job.experienceYears) && job.experienceYears.length === 0
  }

  if (Array.isArray(rule?.$in)) {
    return (
      Array.isArray(job.experienceYears)
      && job.experienceYears.some((year) => rule.$in.includes(year))
    )
  }

  return false
}

const matchesExperienceBucketCondition = (job, condition) => {
  if (!Object.hasOwn(condition ?? {}, 'experienceBucket')) return true
  const rule = condition.experienceBucket

  if (Array.isArray(rule?.$in)) {
    return rule.$in.includes(job.experienceBucket)
  }

  return job.experienceBucket === rule
}

const matchesJobTypeCondition = (job, condition) => {
  if (!Object.hasOwn(condition ?? {}, 'jobType')) return true
  const rule = condition.jobType

  if (Array.isArray(rule?.$in)) {
    return rule.$in.includes(job.jobType)
  }

  return job.jobType === rule
}

const matchesExperienceClause = (job, clause) => {
  if (Array.isArray(clause?.$or)) {
    return clause.$or.some((condition) => matchesExperienceClause(job, condition))
  }

  if (Array.isArray(clause?.$and)) {
    return clause.$and.every((condition) => matchesExperienceClause(job, condition))
  }

  return (
    matchesExperienceRequiredCondition(job, clause)
    && matchesExperienceYearsCondition(job, clause)
    && matchesExperienceBucketCondition(job, clause)
    && matchesJobTypeCondition(job, clause)
  )
}

const matchesExperienceFilters = (job, filter) => {
  const coreFilter = getCoreFilter(filter)
  const clauses = Array.isArray(coreFilter?.$and) ? coreFilter.$and : []
  const directClause = {}

  for (const key of ['experienceYears', 'experienceBucket', 'experienceRequired', 'jobType']) {
    if (Object.hasOwn(coreFilter ?? {}, key)) {
      directClause[key] = coreFilter[key]
    }
  }

  return (
    matchesExperienceClause(job, directClause)
    && clauses.every((clause) => matchesExperienceClause(job, clause))
  )
}

test('normalizeJobListResponseJob removes malformed stored location markup from job cards', () => {
  const job = normalizeJobListResponseJob({
    title: 'Software Engineer',
    company: 'Example Company',
    location: '<span class="jobLocation">DL, India',
    city: '<span class="jobLocation">DL, India',
    locations: [
      '<span class="jobLocation">DL, India',
      '<span class="jobLocation">Mohali, India',
    ],
  })

  assert.equal(job.location, null)
  assert.equal(job.city, null)
  assert.deepEqual(job.locations, [])
})

// Verifies that city filters use normalized keys covering city and locations aliases.
test('getAllJobs matches city filters against expanded location keys', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  let capturedFilter = null

  Job.countDocuments = async () => 0
  Job.distinct = async () => []
  Job.find = (filter) => {
    capturedFilter = filter
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
      exec: async () => [],
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: { city: 'Bangalore' },
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
    const coreFilter = getCoreFilter(capturedFilter)
    assert.equal(coreFilter.status, 'active')
    assert.equal(coreFilter.isPublicIndia, true)
    assert.equal(coreFilter.$or, undefined)
    assert.equal(coreFilter.locationKeys, 'bangalore')
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

test('getAllJobs maps the Intern UI filter to stored internship job types', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  let capturedFilter = null

  Job.countDocuments = async () => 0
  Job.distinct = async () => []
  Job.find = (filter) => {
    capturedFilter = filter
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
      exec: async () => [],
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: { jobType: 'Intern' },
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
    const coreFilter = getCoreFilter(capturedFilter)
    assert.deepEqual(coreFilter.jobType, {
      $in: ['Intern', 'Internship'],
    })
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

// Verifies that city metadata option merging filters and cleans raw location entries.
test('getJobMeta merges expanded locations and removes grouped count labels', async () => {
  const originalSummaryFindOne = JobDatasetSummary.findOne

  JobDatasetSummary.findOne = createSummaryFindOneStub({
    key: 'public-active',
    companies: ['Salesforce'],
    cities: ['3 Locations', 'Hyderabad', 'Bangalore', 'Pune'],
    jobTypes: ['Full-time'],
    totalJobs: 1,
    totalCompanies: 1,
  })

  try {
    const res = createResponseDouble()

    await getJobMeta({}, res)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.data.cities, [
      'Bangalore',
      'Hyderabad',
      'Pune',
    ])
    assert.deepEqual(res.body.data.jobTypes, ['Full-time Experienced'])
  } finally {
    JobDatasetSummary.findOne = originalSummaryFindOne
  }
})

test('getJobMeta removes non-India city options and canonicalizes India location labels', async () => {
  const originalDistinct = Job.distinct
  const originalAggregate = Job.aggregate
  const originalCountDocuments = Job.countDocuments
  const originalSummaryFindOne = JobDatasetSummary.findOne

  Job.distinct = async (field) => {
    if (field === 'company') return ['Salesforce']
    if (field === 'city') {
      return [
        'Bangalore, KA, India',
        'India Offsite (ZIN99)',
        'Pune',
        'India, Airoli, 400708',
        'India,Jhajjar,124108',
        'Nagpur, Maharashtra, India',
        'Ind – Blr Sez 1 (3Rd, 6Th & 7Th Floor)',
        'Austin',
        '1 Smith Haven Mall, Lake Grove, New York',
      ]
    }
    if (field === 'jobType') return ['Full-time']
    return []
  }
  Job.aggregate = createAggregateExecStub(async () => [{ company: 'Salesforce' }])
  Job.countDocuments = async () => 1
  JobDatasetSummary.findOne = createSummaryFindOneStub({
    key: 'public-active',
    companies: ['Salesforce'],
    cities: [
      'Bangalore, KA, India',
      'India Offsite (ZIN99)',
      'Pune',
      'India, Airoli, 400708',
      'India,Jhajjar,124108',
      'Nagpur, Maharashtra, India',
      'Ind â€“ Blr Sez 1 (3Rd, 6Th & 7Th Floor)',
      'Austin',
      '1 Smith Haven Mall, Lake Grove, New York',
    ],
    jobTypes: ['Full-time'],
    totalJobs: 1,
    totalCompanies: 1,
  })

  try {
    const res = createResponseDouble()

    await getJobMeta({
      query: { company: 'Salesforce' },
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
    assert.deepEqual(res.body.data.cities, [
      'Airoli',
      'Bangalore',
      'Jhajjar',
      'Nagpur',
      'Pune',
      'Remote',
    ])
  } finally {
    Job.distinct = originalDistinct
    Job.aggregate = originalAggregate
    Job.countDocuments = originalCountDocuments
    JobDatasetSummary.findOne = originalSummaryFindOne
  }
})

test('getJobMeta removes markup, code, and grouped-count noise from city options', async () => {
  const originalDistinct = Job.distinct
  const originalAggregate = Job.aggregate
  const originalCountDocuments = Job.countDocuments
  const originalSummaryFindOne = JobDatasetSummary.findOne

  Job.distinct = async (field) => {
    if (field === 'company') return ['Salesforce']
    if (field === 'city') {
      return [
        '<span class="jobLocation">DL, India',
        '<span class="jobLocation">Mohali, India',
        "$($('#location').val(), India",
        '2 Locations, India',
        'Delhi, India',
      ]
    }
    if (field === 'jobType') return ['Full-time']
    return []
  }
  Job.aggregate = createAggregateExecStub(async () => [{ company: 'Salesforce' }])
  Job.countDocuments = async () => 1
  JobDatasetSummary.findOne = createSummaryFindOneStub({
    key: 'public-active',
    companies: ['Salesforce'],
    cities: [
      '<span class="jobLocation">DL, India',
      '<span class="jobLocation">Mohali, India',
      "$($('#location').val(), India",
      '2 Locations, India',
      'Delhi, India',
    ],
    jobTypes: ['Full-time'],
    totalJobs: 1,
    totalCompanies: 1,
  })

  try {
    const res = createResponseDouble()

    await getJobMeta({
      query: { company: 'Salesforce' },
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
    assert.deepEqual(res.body.data.cities, ['Delhi'])
  } finally {
    Job.distinct = originalDistinct
    Job.aggregate = originalAggregate
    Job.countDocuments = originalCountDocuments
    JobDatasetSummary.findOne = originalSummaryFindOne
  }
})

test('getJobMeta excludes office codes while retaining the city embedded in an India address', async () => {
  const originalDistinct = Job.distinct
  const originalAggregate = Job.aggregate
  const originalCountDocuments = Job.countDocuments
  const originalSummaryFindOne = JobDatasetSummary.findOne

  Job.distinct = async (field) => {
    if (field === 'city') {
      return [
        '1007 - DXN, TPT, Tirupati, Andhra Pradesh, India',
        '6004 - DEAPL SECTOR-85, Noida, Uttar Pradesh, India',
        'Indore, Madhya Pradesh, India',
      ]
    }
    if (field === 'jobType') return ['Full-time']
    return []
  }
  Job.aggregate = createAggregateExecStub(async () => [])
  Job.countDocuments = async () => 2
  JobDatasetSummary.findOne = createSummaryFindOneStub(null)

  try {
    const res = createResponseDouble()

    await getJobMeta({}, res)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.data.cities, ['Indore', 'Noida', 'Tirupati'])
  } finally {
    Job.distinct = originalDistinct
    Job.aggregate = originalAggregate
    Job.countDocuments = originalCountDocuments
    JobDatasetSummary.findOne = originalSummaryFindOne
  }
})

test('getJobMeta returns the fixed 0-15 experience filter options', async () => {
  const originalDistinct = Job.distinct
  const originalAggregate = Job.aggregate
  const originalSummaryFindOne = JobDatasetSummary.findOne

  Job.distinct = async (field) => {
    if (field === 'company') return ['Salesforce']
    if (field === 'city') return ['Bangalore']
    if (field === 'jobType') return ['Full-time']
    return []
  }
  Job.aggregate = createAggregateExecStub(async () => [{ company: 'Salesforce' }])
  JobDatasetSummary.findOne = createSummaryFindOneStub({
    key: 'public-active',
    companies: ['Salesforce'],
    cities: ['Bangalore'],
    jobTypes: ['Full-time'],
    totalJobs: 1,
    totalCompanies: 1,
  })

  try {
    const res = createResponseDouble()

    await getJobMeta({}, res)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(
      res.body.data.experienceYears,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    )
  } finally {
    Job.distinct = originalDistinct
    Job.aggregate = originalAggregate
    JobDatasetSummary.findOne = originalSummaryFindOne
  }
})

test('getJobMeta returns the first-release filter taxonomy options', async () => {
  const originalDistinct = Job.distinct
  const originalAggregate = Job.aggregate
  const originalSummaryFindOne = JobDatasetSummary.findOne

  Job.distinct = async (field) => {
    if (field === 'company') return ['Salesforce']
    if (field === 'city') return ['Bangalore']
    if (field === 'jobType') return ['Full-time']
    return []
  }
  Job.aggregate = createAggregateExecStub(async () => [{ company: 'Salesforce' }])
  JobDatasetSummary.findOne = createSummaryFindOneStub({
    key: 'public-active',
    companies: ['Salesforce'],
    cities: ['Bangalore'],
    jobTypes: ['Full-time'],
    totalJobs: 1,
    totalCompanies: 1,
  })

  try {
    const res = createResponseDouble()

    await getJobMeta({}, res)

    assert.equal(res.statusCode, 200)
    assert.ok(Array.isArray(res.body.data.skills))
    assert.ok(Array.isArray(res.body.data.roleDomains))
    assert.ok(Array.isArray(res.body.data.seniorityLevels))
    assert.ok(Array.isArray(res.body.data.workArrangements))
    assert.deepEqual(res.body.data.skillMatchModes, [
      { value: 'any', label: 'Match any selected skill' },
      { value: 'all', label: 'Match all selected skills' },
    ])
    assert.deepEqual(res.body.data.skillScopes, [
      { value: 'all', label: 'Required or preferred skills' },
      { value: 'required', label: 'Required skills only' },
    ])
    assert.deepEqual(res.body.data.datePostedOptions, [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 'older-than-30',
    ])
  } finally {
    Job.distinct = originalDistinct
    Job.aggregate = originalAggregate
    JobDatasetSummary.findOne = originalSummaryFindOne
  }
})

test('getJobMeta scopes each option group by the other active filters', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalAggregate = Job.aggregate
  const originalFind = Job.find
  const capturedFilters = new Map()
  let capturedCompanyFilter = null

  Job.countDocuments = async () => 1
  Job.distinct = async (field, filter) => {
    capturedFilters.set(field, filter)
    if (field === 'company') return ['Acme Labs']
    if (field === 'city') return ['Bangalore']
    if (field === 'jobType') return ['Internship']
    if (field === 'primaryRoleDomain') return ['Data Science & AI']
    if (field === 'workArrangement') return ['Remote']
    if (field === 'experienceYears') return [0, 1]
    return []
  }
  Job.aggregate = createAggregateExecStub(async (pipeline) => {
    capturedCompanyFilter = pipeline[0].$match
    return [{ company: 'Acme Labs' }]
  })
  Job.find = () => {
    throw new Error('scoped metadata should not load jobs for experience options')
  }

  try {
    const res = createResponseDouble()

    await getJobMeta({
      query: {
        city: 'Bangalore',
        company: 'Acme Labs',
        jobType: 'Intern',
        roleDomain: 'Data Science & AI',
        workArrangement: 'Remote',
        datePostedDays: '7',
      },
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

    const companyFilter = capturedCompanyFilter ?? capturedFilters.get('company')
    assert.equal(companyFilter.companyKey, undefined)
    assert.equal(companyFilter.locationKeys, 'bangalore')
    assert.deepEqual(companyFilter.jobType, { $in: ['Intern', 'Internship'] })
    assert.equal(companyFilter.primaryRoleDomain, 'Data Science & AI')
    assert.equal(companyFilter.workArrangement, 'Remote')
    assert.ok(companyFilter.postedAt.$gte instanceof Date)
    assert.deepEqual(res.body.data.experienceYears, [0, 1])

    const cityFilter = capturedFilters.get('city')
    assert.equal(cityFilter.locationKeys, undefined)
    assert.equal(cityFilter.companyKey, 'acme labs')
    assert.deepEqual(cityFilter.jobType, { $in: ['Intern', 'Internship'] })

    const jobTypeFilter = capturedFilters.get('jobType')
    assert.deepEqual(jobTypeFilter.jobType, { $ne: null })
    assert.equal(jobTypeFilter.companyKey, 'acme labs')
    assert.equal(jobTypeFilter.locationKeys, 'bangalore')

    const roleDomainFilter = capturedFilters.get('primaryRoleDomain')
    assert.deepEqual(roleDomainFilter.primaryRoleDomain, { $ne: null })
    assert.equal(roleDomainFilter.companyKey, 'acme labs')

    const workArrangementFilter = capturedFilters.get('workArrangement')
    assert.deepEqual(workArrangementFilter.workArrangement, { $ne: null })
    assert.equal(workArrangementFilter.companyKey, 'acme labs')
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.aggregate = originalAggregate
    Job.find = originalFind
  }
})

test('getAllJobs applies advanced filter fields for skills, role domain, seniority, work arrangement, and posted date', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  let capturedFilter = null

  Job.countDocuments = async () => 0
  Job.distinct = async () => []
  Job.find = (filter) => {
    capturedFilter = filter
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
      exec: async () => [],
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: {
        skills: 'python,aws',
        skillMatchMode: 'all',
        skillScope: 'required',
        experienceBucket: '3-5',
        roleDomain: 'Data Science & AI',
        seniority: 'Senior',
        workArrangement: 'Remote',
        datePostedDays: '7',
      },
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
    const coreFilter = getCoreFilter(capturedFilter)
    assert.equal(coreFilter.experienceBucket, '3-5')
    assert.equal(coreFilter.primaryRoleDomain, 'Data Science & AI')
    assert.equal(coreFilter.seniority, 'Senior')
    assert.equal(coreFilter.workArrangement, 'Remote')
    assert.equal(coreFilter.isPublicIndia, true)
    assert.deepEqual(coreFilter.requiredSkillIds, { $all: ['python', 'aws'] })
    assert.ok(coreFilter.postedAt.$gte instanceof Date)
    assert.ok(coreFilter.postedAt.$lt instanceof Date)
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

test('getAllJobs applies multiselect arrays for visible filters', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  let capturedFilter = null

  Job.countDocuments = async () => 0
  Job.distinct = async () => []
  Job.find = (filter) => {
    capturedFilter = filter
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
      exec: async () => [],
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: {
        company: ['Acme Labs', 'CloudWorks'],
        city: ['Bangalore', 'Pune'],
        jobType: ['Intern', 'Full-time Experienced'],
        experienceYear: ['0', '3'],
        experienceBucket: ['0-1', '3-5'],
        roleDomain: ['Data Science & AI', 'Sales & Customer Success'],
        workArrangement: ['Remote', 'Hybrid'],
        datePostedDays: ['7', '14'],
      },
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
    const coreFilter = getCoreFilter(capturedFilter)
    assert.deepEqual(
      coreFilter.companyKey,
      { $in: ['acme labs', 'cloudworks'] },
    )
    assert.deepEqual(coreFilter.experienceBucket, { $in: ['0-1', '3-5'] })
    assert.equal(hasExperienceYearsFilter(coreFilter, [0]), true)
    assert.equal(hasExperienceYearsFilter(coreFilter, [3]), true)
    assert.deepEqual(coreFilter.primaryRoleDomain, {
      $in: ['Data Science & AI', 'Sales & Customer Success'],
    })
    assert.deepEqual(coreFilter.workArrangement, { $in: ['Remote', 'Hybrid'] })
    assert.deepEqual(coreFilter.jobType, {
      $in: ['Intern', 'Internship', 'Full-time Experienced', 'Full-time'],
    })
    assert.deepEqual(
      coreFilter.locationKeys,
      { $in: ['bangalore', 'pune'] },
    )
    assert.equal(coreFilter.isPublicIndia, true)
    assert.ok(coreFilter.$or.some((clause) => clause.postedAt.$gte instanceof Date))
    assert.ok(coreFilter.$or.some((clause) => clause.postedAt.$lt instanceof Date))

    const missingDateResponse = createResponseDouble()
    await getAllJobs({
      query: { datePostedDays: 'na' },
      user: {
        role: 'user',
        accessRole: ACCESS_ROLES.MONTHLY,
        premium: { planId: PLAN_IDS.MONTHLY, status: 'active', expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      },
    }, missingDateResponse)
    const missingDateFilter = getCoreFilter(capturedFilter)
    assert.equal(missingDateFilter.postedAt, null)
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

test('getAllJobs requires stored experienceYears instead of reparsing visible experience text', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  const legacyJobs = [
    {
      _id: 'legacy-range',
      title: 'Legacy Range Match',
      company: 'Acme Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/legacy-range',
      jobType: 'Full-time Experienced',
      experienceRequired: '3-5 years of experience',
    },
    {
      _id: 'legacy-open',
      title: 'Legacy Open Match',
      company: 'CloudWorks',
      city: 'Pune',
      location: 'Pune',
      sourceUrl: 'https://example.com/jobs/legacy-open',
      jobType: 'Full-time Experienced',
      experienceRequired: '5+ years of experience',
    },
    {
      _id: 'legacy-fresher',
      title: 'Legacy Fresher',
      company: 'Starter Co',
      city: 'Hyderabad',
      location: 'Hyderabad',
      sourceUrl: 'https://example.com/jobs/legacy-fresher',
      jobType: 'Full-time Fresher',
      experienceRequired: '0-2 years of experience',
    },
  ]

  const matchesExperienceRequiredCondition = (job, condition) => {
    if (!condition?.experienceRequired) return false

    if (condition.experienceRequired.$exists === false) {
      return !Object.hasOwn(job, 'experienceRequired')
    }

    if (condition.experienceRequired.$not instanceof RegExp) {
      return !condition.experienceRequired.$not.test(job.experienceRequired || '')
    }

    if (condition.experienceRequired.$regex instanceof RegExp) {
      return condition.experienceRequired.$regex.test(job.experienceRequired || '')
    }

    return job.experienceRequired === condition.experienceRequired
  }

  const matchesExperienceYearsCondition = (job, condition) => {
    if (!condition?.experienceYears) return false

    if (condition.experienceYears.$exists === false) {
      return !Object.hasOwn(job, 'experienceYears')
    }

    if (condition.experienceYears.$size === 0) {
      return Array.isArray(job.experienceYears) && job.experienceYears.length === 0
    }

    if (Array.isArray(condition.experienceYears.$in)) {
      return (
        Array.isArray(job.experienceYears)
        && job.experienceYears.some((year) => condition.experienceYears.$in.includes(year))
      )
    }

    return false
  }

  const matchesClause = (job, clause) => {
    if (Array.isArray(clause?.$or)) {
      return clause.$or.some((condition) => matchesClause(job, condition))
    }

    if (Array.isArray(clause?.$and)) {
      return clause.$and.every((condition) => matchesClause(job, condition))
    }

    return (
      matchesExperienceRequiredCondition(job, clause)
      || matchesExperienceYearsCondition(job, clause)
    )
  }

  const applyExperienceFilter = (filter) => {
    const coreFilter = getCoreFilter(filter)
    const clauses = Array.isArray(coreFilter?.$and) ? coreFilter.$and : []
    const matchesStoredYears = (job) => (
      !coreFilter?.experienceYears || matchesExperienceYearsCondition(job, coreFilter)
    )

    return legacyJobs.filter((job) => (
      matchesStoredYears(job)
      && clauses.every((clause) => matchesClause(job, clause))
    ))
  }

  Job.countDocuments = async (filter) => applyExperienceFilter(filter).length
  Job.distinct = async (field, filter) => {
    if (field !== 'company') return []
    return applyExperienceFilter(filter).map((job) => job.company)
  }
  Job.find = (filter) => {
    const jobs = applyExperienceFilter(filter)
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
      exec: async () => jobs,
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: { experienceYear: '5' },
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
    assert.equal(res.body.pagination.total, 0)
    assert.equal(res.body.pagination.totalCompanies, 0)
    assert.deepEqual(res.body.data, [])
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

test('getAllJobs filters jobs with no experience specified separately from zero years', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  const jobs = [
    {
      _id: 'missing-experience',
      title: 'Missing Experience Engineer',
      company: 'Missing Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/missing-experience',
      jobType: 'Full-time Experienced',
      experienceBucket: 'unspecified',
      experienceYears: [],
    },
    {
      _id: 'generic-experience',
      title: 'Generic Experience Engineer',
      company: 'Generic Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/generic-experience',
      jobType: 'Full-time Experienced',
      experienceRequired: 'Engineering background preferred',
      experienceBucket: 'unspecified',
      experienceYears: [],
    },
    {
      _id: 'fresher-experience',
      title: 'Fresher Engineer',
      company: 'Starter Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/fresher-experience',
      jobType: 'Full-time Fresher',
      experienceRequired: 'Freshers can apply',
      experienceBucket: '0-1',
      experienceYears: [0],
    },
    {
      _id: 'three-year-experience',
      title: 'Three Year Engineer',
      company: 'Acme Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/three-year-experience',
      jobType: 'Full-time Experienced',
      experienceRequired: '3 years of experience',
      experienceBucket: '3-5',
      experienceYears: [3],
    },
  ]

  const matchesExperienceRequiredCondition = (job, condition) => {
    if (!condition?.experienceRequired) return false

    if (condition.experienceRequired.$exists === false) {
      return !Object.hasOwn(job, 'experienceRequired')
    }

    if (condition.experienceRequired === null) {
      return job.experienceRequired == null
    }

    if (condition.experienceRequired === '') {
      return job.experienceRequired === ''
    }

    if (condition.experienceRequired.$not instanceof RegExp) {
      return !condition.experienceRequired.$not.test(job.experienceRequired || '')
    }

    if (condition.experienceRequired.$regex instanceof RegExp) {
      return condition.experienceRequired.$regex.test(job.experienceRequired || '')
    }

    return job.experienceRequired === condition.experienceRequired
  }

  const matchesExperienceYearsCondition = (job, condition) => {
    if (!condition?.experienceYears) return false

    if (condition.experienceYears.$exists === false) {
      return !Object.hasOwn(job, 'experienceYears')
    }

    if (condition.experienceYears.$size === 0) {
      return Array.isArray(job.experienceYears) && job.experienceYears.length === 0
    }

    if (Array.isArray(condition.experienceYears.$in)) {
      return (
        Array.isArray(job.experienceYears)
        && job.experienceYears.some((year) => condition.experienceYears.$in.includes(year))
      )
    }

    return false
  }

  const matchesClause = (job, clause) => {
    if (Array.isArray(clause?.$or)) {
      return clause.$or.some((condition) => matchesClause(job, condition))
    }

    if (Array.isArray(clause?.$and)) {
      return clause.$and.every((condition) => matchesClause(job, condition))
    }

    if (clause?.experienceBucket) {
      return job.experienceBucket === clause.experienceBucket
    }

    return (
      matchesExperienceRequiredCondition(job, clause)
      || matchesExperienceYearsCondition(job, clause)
    )
  }

  const applyExperienceFilter = (filter) => {
    return jobs.filter((job) => matchesExperienceFilters(job, filter))
  }

  Job.countDocuments = async (filter) => applyExperienceFilter(filter).length
  Job.distinct = async (_field, filter) => (
    applyExperienceFilter(filter).map((job) => job.company)
  )
  Job.find = (filter) => {
    const filteredJobs = applyExperienceFilter(filter)
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
      exec: async () => filteredJobs,
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: { experienceYear: 'unspecified' },
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
    assert.deepEqual(
      res.body.data.map((job) => job.title),
      ['Missing Experience Engineer', 'Generic Experience Engineer'],
    )
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

test('getAllJobs limits the zero-years filter to full-time fresher roles', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  const jobs = [
    {
      _id: 'full-time-fresher',
      title: 'Full Time Fresher Engineer',
      company: 'Starter Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/full-time-fresher',
      jobType: 'Full-time Fresher',
      experienceRequired: 'Freshers can apply',
      experienceYears: [0],
    },
    {
      _id: 'experienced-zero',
      title: 'Experienced Zero To One Engineer',
      company: 'Range Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/experienced-zero',
      jobType: 'Full-time Experienced',
      experienceRequired: '0-1 years of experience',
      experienceYears: [0, 1],
    },
    {
      _id: 'intern-zero',
      title: 'Intern Zero Experience Engineer',
      company: 'Intern Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/intern-zero',
      jobType: 'Intern',
      experienceRequired: 'No prior experience required',
      experienceYears: [0],
    },
  ]

  const applyExperienceFilter = (filter) => (
    jobs.filter((job) => matchesExperienceFilters(job, filter))
  )

  Job.countDocuments = async (filter) => applyExperienceFilter(filter).length
  Job.distinct = async (_field, filter) => (
    applyExperienceFilter(filter).map((job) => job.company)
  )
  Job.find = (filter) => {
    const filteredJobs = applyExperienceFilter(filter)
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
      exec: async () => filteredJobs,
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: { experienceYear: '0' },
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
    assert.deepEqual(
      res.body.data.map((job) => job.title),
      ['Full Time Fresher Engineer'],
    )
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

test('getAllJobs filters by stored experienceYears before returning the page', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  const jobsWithStaleSignals = [
    {
      _id: 'exact-three',
      title: 'Exact Three Year Engineer',
      company: 'Acme Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/exact-three',
      jobType: 'Full-time Experienced',
      experienceRequired: '3 years of experience',
      experienceYears: [3],
    },
    {
      _id: 'stale-five',
      title: 'Five Year Engineer',
      company: 'CloudWorks',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/stale-five',
      jobType: 'Full-time Experienced',
      experienceRequired: '5 years of experience',
      experienceYears: [5],
    },
    {
      _id: 'stale-seven-plus',
      title: 'Seven Plus Engineer',
      company: 'Range Works',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/stale-seven-plus',
      jobType: 'Full-time Experienced',
      experienceRequired: '7+ years of experience',
      experienceYears: [7, 8, 9, 10, 11, 12, 13, 14, 15],
    },
  ]

  const applyStoredExperienceFilter = (filter) => (
    jobsWithStaleSignals.filter((job) => matchesExperienceFilters(job, filter))
  )

  Job.countDocuments = async (filter) => applyStoredExperienceFilter(filter).length
  Job.distinct = async (_field, filter) => (
    applyStoredExperienceFilter(filter).map((job) => job.company)
  )
  Job.find = (filter) => {
    const jobs = applyStoredExperienceFilter(filter)
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
      exec: async () => jobs,
    }
  }

  try {
    const res = createResponseDouble()

    await getAllJobs({
      query: { experienceYear: '3' },
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
    assert.deepEqual(
      res.body.data.map((job) => job.title),
      ['Exact Three Year Engineer'],
    )
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

test('getAllJobs applies every 0-15 experience option against stored experienceYears', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalFind = Job.find

  const experienceFilterYears = Array.from({ length: 16 }, (_, index) => index)
  const labelForYear = (year) => `${year} ${year === 1 ? 'year' : 'years'}`
  const mismatchedVisibleYearFor = (year) => (year === 15 ? 14 : year + 1)
  const buildScenarioJobsForYear = (year) => [
    {
      _id: `exact-${year}`,
      title: `Exact ${year} Year Engineer`,
      company: `Exact ${year} Labs`,
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: `https://example.com/jobs/exact-${year}`,
      jobType: 'Full-time Experienced',
      experienceRequired: `${labelForYear(year)} of experience`,
      experienceYears: [year],
    },
    {
      _id: 'range-three-five',
      title: 'Three To Five Year Engineer',
      company: 'Range Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/range-three-five',
      jobType: 'Full-time Experienced',
      experienceRequired: '3-5 years of experience',
      experienceYears: [3, 4, 5],
    },
    {
      _id: 'freshers-welcome',
      title: 'Freshers Welcome Engineer',
      company: 'Starter Labs',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/freshers-welcome',
      jobType: 'Full-time Fresher',
      experienceRequired: 'Freshers can apply',
      experienceYears: [0],
    },
    {
      _id: 'seven-plus',
      title: 'Seven Plus Engineer',
      company: 'Principal Systems',
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: 'https://example.com/jobs/seven-plus',
      jobType: 'Full-time Experienced',
      experienceRequired: '7+ years of experience',
      experienceYears: [7, 8, 9, 10, 11, 12, 13, 14, 15],
    },
    {
      _id: `stale-stored-${year}`,
      title: `Stale Stored ${year} Visible ${mismatchedVisibleYearFor(year)} Engineer`,
      company: `Stale ${year} Systems`,
      city: 'Bangalore',
      location: 'Bangalore',
      sourceUrl: `https://example.com/jobs/stale-stored-${year}`,
      jobType: 'Full-time Experienced',
      experienceRequired: `${labelForYear(mismatchedVisibleYearFor(year))} of experience`,
      experienceYears: [year],
    },
  ]
  const expectedTitlesForYear = (year) => [
    ...(year === 0 ? [] : [`Exact ${year} Year Engineer`]),
    ...(year >= 3 && year <= 5 ? ['Three To Five Year Engineer'] : []),
    ...(year === 0 ? ['Freshers Welcome Engineer'] : []),
    ...(year >= 7 ? ['Seven Plus Engineer'] : []),
    ...(year === 0 ? [] : [`Stale Stored ${year} Visible ${mismatchedVisibleYearFor(year)} Engineer`]),
  ]
  let activeExperienceJobs = []

  const applyExperienceFilter = (filter) => (
    activeExperienceJobs.filter((job) => matchesExperienceFilters(job, filter))
  )

  Job.countDocuments = async (filter) => applyExperienceFilter(filter).length
  Job.distinct = async (_field, filter) => (
    applyExperienceFilter(filter).map((job) => job.company)
  )
  Job.find = (filter) => {
    const jobs = applyExperienceFilter(filter)
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
      exec: async () => jobs,
    }
  }

  try {
    for (const year of experienceFilterYears) {
      activeExperienceJobs = buildScenarioJobsForYear(year)
      const res = createResponseDouble()
      const expectedTitles = expectedTitlesForYear(year)

      await getAllJobs({
        query: { experienceYear: String(year) },
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

      assert.equal(res.statusCode, 200, `experienceYear=${year}`)
      assert.equal(res.body.pagination.total, expectedTitles.length, `experienceYear=${year}`)
      assert.deepEqual(
        res.body.data.map((job) => job.title),
        expectedTitles,
        `experienceYear=${year}`,
      )
    }
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.find = originalFind
  }
})

test('getJobMeta scopes company options through stored experienceYears without loading candidate jobs', async () => {
  const originalCountDocuments = Job.countDocuments
  const originalDistinct = Job.distinct
  const originalAggregate = Job.aggregate
  const originalFind = Job.find

  const jobs = [
    {
      title: 'Exact Three Year Engineer',
      company: 'Acme Labs',
      city: 'Bangalore',
      jobType: 'Full-time Experienced',
      experienceRequired: '3 years of experience',
      experienceYears: [3],
    },
    {
      title: 'Five Year Engineer',
      company: 'CloudWorks',
      city: 'Bangalore',
      jobType: 'Full-time Experienced',
      experienceRequired: '5 years of experience',
      experienceYears: [5],
    },
  ]
  let capturedCompanyFilter = null

  Job.countDocuments = async () => 1
  Job.distinct = async (field, filter = {}) => {
    if (field === 'company') {
      capturedCompanyFilter = filter
      return jobs
        .filter((job) => matchesExperienceFilters(job, filter))
        .map((job) => job.company)
    }
    if (field === 'city') return ['Bangalore']
    if (field === 'jobType') return ['Full-time Experienced']
    if (field === 'experienceYears') return [3, 5]
    if (field === 'primaryRoleDomain') return []
    if (field === 'workArrangement') return []
    return []
  }
  Job.aggregate = createAggregateExecStub(async (pipeline) => {
    const companyFilter = pipeline[0].$match
    capturedCompanyFilter = companyFilter
    return jobs
      .filter((job) => matchesExperienceFilters(job, companyFilter))
      .map((job) => ({ company: job.company }))
  })
  Job.find = () => {
    throw new Error('scoped metadata should not load jobs for experience filtering')
  }

  try {
    const res = createResponseDouble()

    await getJobMeta({
      query: { experienceYear: '3' },
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
    assert.deepEqual(res.body.data.companies, ['Acme Labs'])
    assert.deepEqual(res.body.data.experienceYears, [3, 5])
    assert.equal(hasExperienceYearsFilter(capturedCompanyFilter, [3]), true)
  } finally {
    Job.countDocuments = originalCountDocuments
    Job.distinct = originalDistinct
    Job.aggregate = originalAggregate
    Job.find = originalFind
  }
})

test('getJobMeta omits the default company list from the unscoped metadata payload', async () => {
  const originalDistinct = Job.distinct
  const originalAggregate = Job.aggregate
  const originalSummaryFindOne = JobDatasetSummary.findOne

  Job.distinct = async (field) => {
    if (field === 'company') return ['Salesforce', 'Acme Labs']
    if (field === 'city') return ['Hyderabad']
    if (field === 'jobType') return ['Full-time']
    return []
  }
  Job.aggregate = createAggregateExecStub(async () => [
    { company: 'Salesforce' },
    { company: 'Acme Labs' },
  ])
  JobDatasetSummary.findOne = createSummaryFindOneStub({
    key: 'public-active',
    companies: ['Acme Labs', 'Salesforce'],
    cities: ['Hyderabad'],
    jobTypes: ['Full-time'],
    totalJobs: 2,
    totalCompanies: 2,
  })

  try {
    const res = createResponseDouble()

    await getJobMeta({}, res)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.data.companies, [])
    assert.deepEqual(res.body.data.cities, ['Hyderabad'])
    assert.deepEqual(res.body.data.jobTypes, ['Full-time Experienced'])
  } finally {
    Job.distinct = originalDistinct
    Job.aggregate = originalAggregate
    JobDatasetSummary.findOne = originalSummaryFindOne
  }
})
