import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  JOBS_PAGE_URL,
  extractHighlightedRoles,
  extractJobCategories,
} from '../../scraper/bluestock/script.js'

const careersHtml = `
  <html>
    <body>
      <div class="alert">
        <strong>Social Media Internship & Job</strong>
        <a href="https://tally.so/r/mYka9W">
          <button>Apply Now</button>
        </a>
      </div>
    </body>
  </html>
`

const jobsHtml = `
  <html>
    <body>
      <div class="job-category-card">
        <div class="job-category-card-body">
          <h5>Software Engineer</h5>
          <p><i class="fas fa-briefcase"></i> 04 Job Openings</p>
          <a href="https://bluestock.in/careers/jobs/apply/" class="view-all-jobs-btn">View All Jobs</a>
        </div>
      </div>
      <div class="job-category-card">
        <div class="job-category-card-body">
          <h5>Business Analyst</h5>
          <p><i class="fas fa-briefcase"></i> 02 Job Openings</p>
          <a href="https://bluestock.in/careers/jobs/apply/" class="view-all-jobs-btn">View All Jobs</a>
        </div>
      </div>
      <div class="job-category-card">
        <div class="job-category-card-body">
          <h5>UI UX Designer</h5>
          <p><i class="fas fa-briefcase"></i> 03 Job Openings</p>
          <a href="https://bluestock.in/careers/jobs/apply/" class="view-all-jobs-btn">View All Jobs</a>
        </div>
      </div>
    </body>
  </html>
`

test('career page constants keep the Bluestock scraper on the official careers pages', () => {
  assert.equal(CAREER_PAGE_URL, 'https://bluestock.in/careers/')
  assert.equal(JOBS_PAGE_URL, 'https://bluestock.in/careers/jobs/')
})

test('extractHighlightedRoles reads promoted Bluestock careers alerts', () => {
  assert.deepEqual(extractHighlightedRoles(careersHtml), [
    {
      title: 'Social Media Internship & Job',
      company: 'Bluestock Fintech',
      department: null,
      location: null,
      city: null,
      jobId: 'social-media-internship-job',
      requisitionId: null,
      sourceUrl: 'https://bluestock.in/careers/',
      applyUrl: 'https://tally.so/r/mYka9W',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Highlighted opening from the official Bluestock careers page.',
    },
  ])
})

test('extractJobCategories reads public Bluestock job categories and opening counts', () => {
  assert.deepEqual(extractJobCategories(jobsHtml), [
    {
      title: 'Software Engineer',
      company: 'Bluestock Fintech',
      department: null,
      location: null,
      city: null,
      jobId: 'software-engineer',
      requisitionId: null,
      sourceUrl: 'https://bluestock.in/careers/jobs/',
      applyUrl: 'https://bluestock.in/careers/jobs/apply/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: '04 Job Openings',
    },
    {
      title: 'Business Analyst',
      company: 'Bluestock Fintech',
      department: null,
      location: null,
      city: null,
      jobId: 'business-analyst',
      requisitionId: null,
      sourceUrl: 'https://bluestock.in/careers/jobs/',
      applyUrl: 'https://bluestock.in/careers/jobs/apply/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: '02 Job Openings',
    },
    {
      title: 'UI UX Designer',
      company: 'Bluestock Fintech',
      department: null,
      location: null,
      city: null,
      jobId: 'ui-ux-designer',
      requisitionId: null,
      sourceUrl: 'https://bluestock.in/careers/jobs/',
      applyUrl: 'https://bluestock.in/careers/jobs/apply/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: '03 Job Openings',
    },
  ])
})
