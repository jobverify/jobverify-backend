import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
  <table>
    <tr><th>Opportunity Title</th><th>Experience</th><th>Deadline</th><th>Apply Link</th></tr>
    <tr>
      <td><a href="/full-stack-development-internship/">Full Stack Web Development Internship</a></td>
      <td>0 Year (Fresher)</td><td>Open</td><td><a href="/full-stack-development-internship/">More Details</a></td>
    </tr>
    <tr>
      <td>Data Science with ML</td><td>0-1 year (Fresher)</td><td>Upcoming</td><td>More Details</td>
    </tr>
    <tr>
      <td>Social Media Marketing Executive</td><td>0-1 Year (Fresher)</td><td>Open</td><td><a href="undefined">More Details</a></td>
    </tr>
    <tr>
      <td>Front-end Developer</td><td>0-1 Year</td><td>Closed</td><td>More Details</td>
    </tr>
    <tr>
      <td>Business Development Associate</td><td>0-1 Year (Fresher)</td><td>Open</td><td><a href="/business-development-associate/">More Details</a></td>
    </tr>
  </table>
`

const loadBusinessWebSolutionsModule = async () => {
  try {
    return await import('../businesswebsolutions/script.js')
  } catch {
    return null
  }
}

test('extractOpenJobs maps only open Business Web Solutions opportunities from the official careers table', async () => {
  const businessWebSolutions = await loadBusinessWebSolutionsModule()
  assert.ok(businessWebSolutions, 'Business Web Solutions scraper module must exist')

  assert.deepEqual(businessWebSolutions.extractOpenJobs(careersHtml), [
    {
      title: 'Full Stack Web Development Internship',
      company: 'Business Web Solutions',
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId: 'full-stack-web-development-internship',
      requisitionId: 'full-stack-web-development-internship',
      sourceUrl: 'https://businesswebsolutions.in/careers/',
      applyUrl: 'https://businesswebsolutions.in/full-stack-development-internship/',
      employmentType: null,
      experienceRequired: '0 Year (Fresher)',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Remote',
      compensation: null,
    },
    {
      title: 'Social Media Marketing Executive',
      company: 'Business Web Solutions',
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId: 'social-media-marketing-executive',
      requisitionId: 'social-media-marketing-executive',
      sourceUrl: 'https://businesswebsolutions.in/careers/',
      applyUrl: 'https://businesswebsolutions.in/careers/',
      employmentType: null,
      experienceRequired: '0-1 Year (Fresher)',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Remote',
      compensation: null,
    },
    {
      title: 'Business Development Associate',
      company: 'Business Web Solutions',
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId: 'business-development-associate',
      requisitionId: 'business-development-associate',
      sourceUrl: 'https://businesswebsolutions.in/careers/',
      applyUrl: 'https://businesswebsolutions.in/business-development-associate/',
      employmentType: null,
      experienceRequired: '0-1 Year (Fresher)',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Remote',
      compensation: null,
    },
  ])
})

test('run fetches the official Business Web Solutions careers page', async () => {
  const businessWebSolutions = await loadBusinessWebSolutionsModule()
  assert.ok(businessWebSolutions, 'Business Web Solutions scraper module must exist')

  const jobs = await businessWebSolutions.createBusinessWebSolutionsScraper().run({
    fetchText: async (url) => {
      assert.equal(url, businessWebSolutions.CAREERS_URL)
      return careersHtml
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'businesswebsolutions')
  assert.equal(jobs[0].link, 'https://businesswebsolutions.in/full-stack-development-internship/')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
