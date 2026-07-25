import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  extractJobEntries,
  isIndiaLocation,
} from '../bluebinaries/script.js'

const listingHtml = `
  <html>
    <body>
      <div class="acc-job-post">
        <div class="job-details" data-attribute="sd">
          <div class="job-role">
            <h3>Software Developer</h3>
            <span>Posted on 01-Mar-2024</span>
          </div>
          <div class="job-location">
            <span>BlueBinaries Engineering and Solutions India Pvt Ltd, Chennai, India</span>
          </div>
        </div>
        <div class="job-requirements" id="sd">
          <p>Job Duties:</p>
          <ul>
            <li>Build embedded software systems</li>
            <li>Collaborate with cross-functional teams</li>
          </ul>
        </div>
      </div>
      <div class="acc-job-post">
        <div class="job-details" data-attribute="qa">
          <div class="job-role">
            <h3>Quality Engineer</h3>
            <span>Posted on 04-Oct-2023</span>
          </div>
          <div class="job-location">
            <span>BlueBinaries Engineering and Solutions Inc., Troy, MI</span>
          </div>
        </div>
        <div class="job-requirements" id="qa">
          <p>Job Duties:</p>
          <ul>
            <li>Lead quality validation activities</li>
          </ul>
        </div>
      </div>
    </body>
  </html>
`

test('CAREER_PAGE_URL keeps the Blue Binaries scraper on the official careers page', () => {
  assert.equal(CAREER_PAGE_URL, 'https://www.bluebinaries.com/become-a-bluebee/')
})

test('isIndiaLocation identifies India-based Blue Binaries roles', () => {
  assert.equal(
    isIndiaLocation('BlueBinaries Engineering and Solutions India Pvt Ltd, Chennai, India'),
    true,
  )
  assert.equal(isIndiaLocation('BlueBinaries Engineering and Solutions Inc., Troy, MI'), false)
})

test('extractJobEntries reads Blue Binaries accordion listings into scraper jobs', () => {
  assert.deepEqual(extractJobEntries(listingHtml), [
    {
      title: 'Software Developer',
      company: 'Blue Binaries',
      department: null,
      location: 'BlueBinaries Engineering and Solutions India Pvt Ltd, Chennai, India',
      city: 'Chennai',
      jobId: 'sd',
      requisitionId: null,
      sourceUrl: 'https://www.bluebinaries.com/become-a-bluebee/#sd',
      applyUrl: 'https://www.bluebinaries.com/become-a-bluebee/#sd',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2024-03-01',
      closingDate: null,
      jobDescription: [
        'Job Duties:',
        'Build embedded software systems',
        'Collaborate with cross-functional teams',
      ].join('\n'),
    },
    {
      title: 'Quality Engineer',
      company: 'Blue Binaries',
      department: null,
      location: 'BlueBinaries Engineering and Solutions Inc., Troy, MI',
      city: 'Troy',
      jobId: 'qa',
      requisitionId: null,
      sourceUrl: 'https://www.bluebinaries.com/become-a-bluebee/#qa',
      applyUrl: 'https://www.bluebinaries.com/become-a-bluebee/#qa',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2023-10-04',
      closingDate: null,
      jobDescription: [
        'Job Duties:',
        'Lead quality validation activities',
      ].join('\n'),
    },
  ])
})
