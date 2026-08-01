import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

test('normalizeScrapedJob enriches engineering jobs into the unified scraper schema', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'SDE II',
      company: 'Example Corp',
      location: 'Bengaluru, India',
      city: 'Bangalore',
      department: 'Platform Engineering',
      description: 'Build cloud services for developer workflows using Node.js, AWS, and PostgreSQL.',
      requiredSkills: ['Node.js', 'AWS', 'Distributed Systems'],
      link: 'https://careers.example.com/jobs/123',
      jobId: 'JR-123',
      experienceRequired: '3 to 5 years of platform engineering experience',
    },
    {
      source: 'example-source',
      companyCareerPage: 'https://careers.example.com',
      atsPlatform: 'workday',
    },
  )

  assert.equal(normalized.originalTitle, 'SDE II')
  assert.equal(normalized.normalizedTitle, 'Software Engineer')
  assert.equal(normalized.jobCategory, 'Software Engineer')
  assert.equal(normalized.engineeringDomain, 'Software Engineering')
  assert.equal(normalized.employmentType, 'Full-time')
  assert.equal(normalized.experienceLevel, 'Mid Level')
  assert.equal(normalized.jobType, 'Full-time Experienced')
  assert.equal(normalized.remoteStatus, 'On-site')
  assert.equal(normalized.country, 'India')
  assert.equal(normalized.companyCareerPage, 'https://careers.example.com')
  assert.equal(normalized.companyDomain, 'careers.example.com')
  assert.equal(normalized.applyUrl, 'https://careers.example.com/jobs/123')
  assert.equal(normalized.sourceUrl, 'https://careers.example.com/jobs/123')
  assert.equal(normalized.atsPlatform, 'workday')
  assert.deepEqual(normalized.requiredSkills, ['Node.js', 'AWS', 'Distributed Systems'])
  assert.equal(normalized.experienceBucket, '3-5')
  assert.equal(normalized.seniority, 'Mid Level')
  assert.equal(normalized.primaryRoleDomain, 'Software Engineering')
  assert.deepEqual(normalized.requiredSkillIds, ['node-js', 'aws'])
  assert.deepEqual(normalized.skillIds, ['node-js', 'aws', 'postgresql', 'sql'])
})

test('normalizeScrapedJob fills missing optional fields with null-safe defaults', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Mechanical Design Engineer',
      company: 'Machines India',
      location: 'Pune, India',
      city: 'Pune',
      link: 'https://jobs.machines.example/design-role',
    },
    {
      source: 'machines-india',
      companyCareerPage: 'https://jobs.machines.example',
      atsPlatform: 'official-company-careers',
    },
  )

  assert.equal(normalized.normalizedTitle, 'Mechanical Engineer')
  assert.equal(normalized.jobCategory, 'Mechanical Engineer')
  assert.equal(normalized.engineeringDomain, 'Mechanical')
  assert.equal(normalized.minimumQualification, null)
  assert.equal(normalized.preferredQualification, null)
  assert.equal(normalized.experienceRequired, null)
  assert.equal(normalized.salary, null)
  assert.equal(normalized.requisitionId, null)
  assert.ok(normalized.scrapedTimestamp instanceof Date)
})

test('normalizeScrapedJob composes full-time fresher job types from entry-level cues', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Graduate Software Engineer',
      company: 'Example',
      location: 'Bengaluru, India',
      city: 'Bangalore',
      description: 'Campus hiring role for 2026 graduates.',
      minimumQualification: 'B.Tech in Computer Science',
      experienceRequired: '0-1 years of experience',
      link: 'https://careers.example.com/jobs/grad-role',
    },
    {
      source: 'example',
      companyCareerPage: 'https://careers.example.com',
      atsPlatform: 'workday',
    },
  )

  assert.equal(normalized.employmentType, 'Full-time')
  assert.equal(normalized.experienceLevel, 'Entry Level')
  assert.equal(normalized.jobType, 'Full-time Fresher')
})

test('normalizeScrapedJob composes full-time experienced job types from non-entry cues', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Software Engineer II',
      company: 'Example',
      location: 'Pune, India',
      city: 'Pune',
      description: 'Build internal tooling for engineering systems.',
      experienceRequired: '2-4 years of software engineering experience',
      link: 'https://careers.example.com/jobs/se2-role',
    },
    {
      source: 'example',
      companyCareerPage: 'https://careers.example.com',
      atsPlatform: 'workday',
    },
  )

  assert.equal(normalized.employmentType, 'Full-time')
  assert.equal(normalized.experienceLevel, 'Junior Level')
  assert.equal(normalized.jobType, 'Full-time Experienced')
})

test('normalizeScrapedJob does not treat graduate wording as fresher when explicit multi-year experience is present', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Cloud DevOps Engineer',
      company: 'Airbus',
      location: 'Bangalore Area',
      city: 'Bangalore',
      description: 'Support cloud platform and DevOps operations for Airbus teams.',
      experienceRequired: 'Experience: Graduate with 3-7 years of experience in Cloud Platform and DevOps development',
      link: 'https://ag.wd3.myworkdayjobs.com/en-US/Airbus/job/Bangalore-Area/Cloud-DevOps-Engineer_JR10427392',
    },
    {
      source: 'airbus',
      companyCareerPage: 'https://ag.wd3.myworkdayjobs.com/en-US/Airbus',
      atsPlatform: 'workday',
    },
  )

  assert.equal(normalized.employmentType, 'Full-time')
  assert.equal(normalized.experienceLevel, 'Mid Level')
  assert.equal(normalized.jobType, 'Full-time Experienced')
})

test('normalizeScrapedJob composes internship and contract job types from apiPortal employment cues', () => {
  const internship = normalizeScrapedJob(
    {
      title: 'Software Engineering Intern',
      company: 'Razorpay',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      employmentType: 'Internship',
      link: 'https://razorpay.com/careers/job/intern-role',
    },
    {
      source: 'razorpay',
      companyCareerPage: 'https://razorpay.com/careers/',
      atsPlatform: 'greenhouse',
    },
  )

  const contract = normalizeScrapedJob(
    {
      title: 'QA Automation Engineer',
      company: 'Freshworks',
      location: 'Chennai, India',
      city: 'Chennai',
      employmentType: 'Contract',
      link: 'https://www.freshworks.com/company/careers/contract-role',
    },
    {
      source: 'freshworks',
      companyCareerPage: 'https://www.freshworks.com/company/careers/',
      atsPlatform: 'smartrecruiters',
    },
  )

  assert.equal(internship.jobType, 'Internship')
  assert.equal(contract.jobType, 'Contract')
})

test('normalizeScrapedJob suppresses unsupported part-time employment types', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Part-time Support Engineer',
      company: 'Example',
      location: 'Remote, India',
      city: 'Remote',
      employmentType: 'Part-time',
      link: 'https://careers.example.com/jobs/part-time-role',
    },
    {
      source: 'example',
      companyCareerPage: 'https://careers.example.com',
      atsPlatform: 'greenhouse',
    },
  )

  assert.equal(normalized.employmentType, null)
  assert.equal(normalized.jobType, null)
})

test('normalizeScrapedJob respects explicit experienceLevel cues for full-time apiPortal roles', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Software Development Engineer',
      company: 'Swiggy',
      location: 'Bangalore',
      city: 'Bangalore',
      employmentType: 'Full-time',
      experienceLevel: 'Entry Level',
      link: 'https://careers.swiggy.com/#/careers/apply?src%3Dcareers%26p%3Dexample',
    },
    {
      source: 'swiggy',
      companyCareerPage: 'https://careers.swiggy.com/',
      atsPlatform: 'mynexthire',
    },
  )

  assert.equal(normalized.employmentType, 'Full-time')
  assert.equal(normalized.experienceLevel, 'Entry Level')
  assert.equal(normalized.jobType, 'Full-time Fresher')
})

test('normalizeScrapedJob formats flattened role descriptions after scraping', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'V&V Designer',
      company: 'Alstom',
      location: 'Bangalore, India',
      city: 'Bangalore',
      jobDescription: 'About this role Leading societies to a low carbon future, Alstom develops and markets mobility solutions. ROLE : V&V Designer As a Validation Designer, candidate will validate Driver Machine Interface application software. RESPONSIBILITIES : 1. Define the Test strategy and Test Plan 2. Specify, design and develop the validation environment EDUCATION: Bachelor in Engineering TECHNICAL COMPETENCIES & EXPERIENCE: 1. 3-8 years of experience in Software Testing',
      link: 'https://jobsearch.alstom.com/job/example',
    },
    {
      source: 'alstom',
      companyCareerPage: 'https://jobsearch.alstom.com',
      atsPlatform: 'successfactors',
    },
  )

  assert.equal(
    normalized.jobDescription,
    'Leading societies to a low carbon future, Alstom develops and markets mobility solutions.\n\n'
      + 'ROLE:\n'
      + 'V&V Designer\n'
      + 'As a Validation Designer, candidate will validate Driver Machine Interface application software.\n\n'
      + 'RESPONSIBILITIES:\n'
      + '1. Define the Test strategy and Test Plan\n'
      + '2. Specify, design and develop the validation environment\n\n'
      + 'EDUCATION:\n'
      + 'Bachelor in Engineering\n\n'
      + 'TECHNICAL COMPETENCIES & EXPERIENCE:\n'
      + '1. 3-8 years of experience in Software Testing',
  )
})

test('normalizeScrapedJob filters generic job-link skillNames tags down to tool names for allowlisted api sources', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Software Engineer',
      company: 'AccioJob',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      requiredSkills: [
        'Node.js',
        'Research',
        'Leadership',
        'AWS Cloud & Microservices Architecture',
        'Figma',
        'Customer Support',
        'HubSpot CRM',
      ],
      link: 'https://careers.example.com/jobs/skillnames-role',
    },
    {
      source: 'acciojob',
      companyCareerPage: 'https://careers.example.com',
      atsPlatform: 'keka',
    },
  )

  assert.deepEqual(normalized.requiredSkills, ['Node.js', 'AWS', 'Figma', 'HubSpot'])
})

test('normalizeScrapedJob does not filter requiredSkills for non-skillNames sources', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Software Engineer',
      company: 'Example Corp',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      requiredSkills: ['Node.js', 'Research', 'Leadership'],
      link: 'https://careers.example.com/jobs/non-skillnames-role',
    },
    {
      source: 'example-source',
      companyCareerPage: 'https://careers.example.com',
      atsPlatform: 'workday',
    },
  )

  assert.deepEqual(normalized.requiredSkills, ['Node.js', 'Research', 'Leadership'])
})

test('normalizeScrapedJob prefers high-confidence experience evidence over noisy Workday prose', () => {
  const normalized = normalizeScrapedJob(
    {
      title: 'Customer Service Associate III/Analyst II ( Voice Process)',
      company: 'Allstate',
      location: 'Pune, India',
      city: 'Pune',
      experienceRequired: 'And for more than 90 years, our innovative drive has kept us a step ahead of our customers evolving needs',
      jobDescription: 'At Allstate, great things happen when our people work together. Job Description RESPONSIBILITIES: Support claims workflows. Experience 1-4 years experience (Preferred).',
      link: 'https://allstate.wd5.myworkdayjobs.com/allstate_careers/job/Ind--Pune/Customer-Service-Associate-III-Analyst-II---Voice-Process-_R31706',
    },
    {
      source: 'allstate',
      companyCareerPage: 'https://www.allstate.jobs',
      atsPlatform: 'workday',
    },
  )

  assert.equal(normalized.experienceRequired, '1-4 years')
})
