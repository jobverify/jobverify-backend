import assert from 'node:assert/strict'
import test from 'node:test'

const loadDataPatternsModule = async () => {
  try {
    return await import('../../scraper/datapatterns/script.js')
  } catch {
    assert.fail('Expected Data Patterns scraper module at ../../scraper/scraper/datapatterns/script.js')
  }
}

const listingHtml = `
<div id="currentopening">
  <table>
    <tr><td>788</td><td><a href='openings.php?id=788'>General Manager Projects</a></td><td><p>Summary</p></td><td>Electronics Design and Manufacturing</td><td>General Manager</td><td>jobs@datapatterns.co.in</td></tr>
  </table>
</div>
`

const detailHtml = `
<div id="currentopening">
  <div id="opening"><div id="openingleft">Designation</div><div id="openingright">General Manager Projects</div></div>
  <div id="opening"><div id="openingleft">Job Description</div><div id="openingright"><p><strong>Qualification</strong>: B.E. / B.Tech in ECE.<br />Lead defence electronics project delivery.</p></div></div>
  <div id="opening"><div id="openingleft">Experience</div><div id="openingright">25 - 30 Years</div></div>
  <div id="opening"><div id="openingleft">Industry Type</div><div id="openingright">Electronics Design and Manufacturing</div></div>
  <div id="opening"><div id="openingleft">Functional Area</div><div id="openingright">General Manager</div></div>
  <div id="opening"><div id="openingleft">Location</div><div id="openingright">Chennai</div></div>
  <div id="opening"><div id="openingleft">Email</div><div id="openingright"><a href="mailto:jobs@datapatterns.co.in?subject=General%20Manager%20Projects">jobs@datapatterns.co.in</a></div></div>
</div>
`

test('extractDataPatternsJob maps official detail-page fields into a normalized job record', async () => {
  const dataPatterns = await loadDataPatternsModule()
  const [listing] = dataPatterns.extractListings(listingHtml)

  assert.deepEqual(dataPatterns.extractDataPatternsJob(detailHtml, listing), {
    title: 'General Manager Projects',
    company: 'Data Patterns',
    department: 'General Manager',
    location: 'Chennai, India',
    city: 'Chennai',
    country: 'India',
    jobId: 'datapatterns-788',
    requisitionId: '788',
    sourceUrl: 'https://www.datapatternsindia.com/careers/openings.php?id=788',
    applyUrl: 'mailto:jobs@datapatterns.co.in?subject=General%20Manager%20Projects',
    employmentType: null,
    experienceRequired: '25 - 30 Years',
    minimumQualification: 'B.E. / B.Tech in ECE.',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Qualification: B.E. / B.Tech in ECE. Lead defence electronics project delivery.',
  })
})

test('run fetches official Data Patterns listing and detail pages then decorates jobs', async () => {
  const dataPatterns = await loadDataPatternsModule()
  const requestedUrls = []
  const scraper = dataPatterns.createDataPatternsScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === dataPatterns.CAREER_PAGE_URL) return listingHtml
      if (url === 'https://www.datapatternsindia.com/careers/openings.php?id=788') return detailHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    dataPatterns.CAREER_PAGE_URL,
    'https://www.datapatternsindia.com/careers/openings.php?id=788',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'datapatterns')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
