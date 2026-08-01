import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h3>Work With Everlife CPC</h3>
    <p>Interested in working with Everlife CPC? Kindly mail your resume to hiring@cpcdiagnostics.in</p>

    <h5>Area Manager</h5>
    <p>Location: Mumbai</p>
    <a href="https://everlife.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fjob-mumbai___apply%3D1___private%3D1___id%3Darea-manager-mumbai">Apply Now</a>

    <h5>Scientific Businees Officer</h5>
    <p>Location: Chennai</p>
    <a href="https://everlife.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fjob-chennai___apply%3D1___private%3D1___id%3Dscientific-business-officer-chennai">Apply Now</a>
  </body>
</html>
`

const loadEverlifeCpcModule = async () => {
  try {
    return await import('../../scraper/everlifecpc/script.js')
  } catch {
    assert.fail('Expected Everlife CPC scraper module at ../../scraper/everlifecpc/script.js')
  }
}

test('extractJobs maps the official Everlife CPC openings and Darwinbox apply links', async () => {
  const everlifeCpc = await loadEverlifeCpcModule()

  assert.equal(everlifeCpc.CAREERS_URL, 'https://cpcdiagnostics.in/career')
  assert.deepEqual(everlifeCpc.extractJobs(CAREERS_HTML), [{
    title: 'Area Manager',
    company: 'Everlife CPC',
    department: null,
    location: 'Mumbai, India',
    city: 'Mumbai',
    country: 'India',
    jobId: 'everlifecpc-area-manager-mumbai',
    requisitionId: 'everlifecpc-area-manager-mumbai',
    sourceUrl: 'https://cpcdiagnostics.in/career',
    applyUrl: 'https://everlife.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fjob-mumbai___apply%3D1___private%3D1___id%3Darea-manager-mumbai',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Apply via the verified Everlife CPC Darwinbox handoff from the official careers page.',
    remoteStatus: 'On-site',
  }, {
    title: 'Scientific Businees Officer',
    company: 'Everlife CPC',
    department: null,
    location: 'Chennai, India',
    city: 'Chennai',
    country: 'India',
    jobId: 'everlifecpc-scientific-businees-officer-chennai',
    requisitionId: 'everlifecpc-scientific-businees-officer-chennai',
    sourceUrl: 'https://cpcdiagnostics.in/career',
    applyUrl: 'https://everlife.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fjob-chennai___apply%3D1___private%3D1___id%3Dscientific-business-officer-chennai',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Apply via the verified Everlife CPC Darwinbox handoff from the official careers page.',
    remoteStatus: 'On-site',
  }])
})

test('run uses the rendered official Everlife CPC careers page and decorates runner fields', async () => {
  const everlifeCpc = await loadEverlifeCpcModule()
  const requestedUrls = []

  const jobs = await everlifeCpc.createEverlifeCpcScraper().run({
    fetchRenderedHtml: async (url) => {
      requestedUrls.push(url)
      return CAREERS_HTML
    },
    now: () => '2026-07-09T12:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, ['https://cpcdiagnostics.in/career'])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'everlifecpc')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-09T12:00:00.000Z')
})
