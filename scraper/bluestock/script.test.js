import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ATS_PLATFORM,
  CAREER_PAGE_URL,
  COMPANY_DOMAIN,
  JOBS_PAGE_URL,
  extractHighlightedRoles,
  extractJobCategories,
} from './script.js'

const highlightedCareersHtml = `
  <section>
    <strong>Social Media Internship &amp; Job</strong>
    <a href="https://tally.so/r/mYka9W">Apply Now</a>
  </section>
`

const jobsCategoryHtml = `
  <div class="job-category-card">
    <h5>Software Engineer</h5>
    <p>04 Job Openings</p>
    <a href="https://bluestock.in/careers/jobs/apply/">View All Jobs</a>
  </div>
  <div class="job-category-card">
    <h5>Business Analyst</h5>
    <p>02 Job Openings</p>
    <a href="https://bluestock.in/careers/jobs/apply/">View All Jobs</a>
  </div>
`

test('extractHighlightedRoles keeps the public careers page as checked evidence for highlighted jobs', () => {
  assert.deepEqual(extractHighlightedRoles(highlightedCareersHtml), [
    {
      title: 'Social Media Internship & Job',
      company: 'Bluestock Fintech',
      department: null,
      location: null,
      city: null,
      jobId: 'social-media-internship-job',
      requisitionId: null,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl: 'https://tally.so/r/mYka9W',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Highlighted opening from the official Bluestock careers page.',
      publicExperienceChecked: true,
      companyCareerPage: CAREER_PAGE_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: ATS_PLATFORM,
    },
  ])
})

test('extractJobCategories marks the generic public category cards as checked-missing experience surfaces', () => {
  assert.deepEqual(extractJobCategories(jobsCategoryHtml), [
    {
      title: 'Software Engineer',
      company: 'Bluestock Fintech',
      department: null,
      location: null,
      city: null,
      jobId: 'software-engineer',
      requisitionId: null,
      sourceUrl: JOBS_PAGE_URL,
      applyUrl: 'https://bluestock.in/careers/jobs/apply/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: '04 Job Openings',
      publicExperienceChecked: true,
      companyCareerPage: CAREER_PAGE_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: ATS_PLATFORM,
    },
    {
      title: 'Business Analyst',
      company: 'Bluestock Fintech',
      department: null,
      location: null,
      city: null,
      jobId: 'business-analyst',
      requisitionId: null,
      sourceUrl: JOBS_PAGE_URL,
      applyUrl: 'https://bluestock.in/careers/jobs/apply/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: '02 Job Openings',
      publicExperienceChecked: true,
      companyCareerPage: CAREER_PAGE_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: ATS_PLATFORM,
    },
  ])
})
