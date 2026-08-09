import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h3>Join Our Team</h3>
    <h1>These are positions currently open at SightSpectrum</h1>
    <section class="job-opening">
      <h2>Data Engineer</h2>
      <p>chennai</p>
      <p>Role Summary: Build and manage scalable data pipelines and infrastructure to support analytics and business insights.</p>
      <h3>Requirements</h3>
      <ul>
        <li>SQL</li>
        <li>Python</li>
        <li>Spark</li>
      </ul>
      <span>Apply</span>
    </section>
    <section class="job-opening">
      <h2>UI/UX Designer</h2>
      <p>Remote</p>
      <p>We are looking for a talented Frontend Engineer to join our dynamic team.</p>
      <h3>Requirements</h3>
      <ul>
        <li>React</li>
        <li>Vue.js</li>
        <li>HTML/CSS</li>
      </ul>
      <span>Apply</span>
    </section>
    <section class="job-opening">
      <h2>Sales Lead</h2>
      <p>Dallas</p>
      <p>Lead North America growth.</p>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/sightspectrumtechnologysolutions/script.js')
  } catch {
    assert.fail('Expected SightSpectrum Technology Solutions scraper module at ../../scraper/sightspectrumtechnologysolutions/script.js')
  }
}

test('SightSpectrum Technology Solutions helpers stay pinned to the verified inline careers sections', async () => {
  const sightspectrum = await loadModule()

  assert.equal(sightspectrum.SOURCE, 'sightspectrumtechnologysolutions')
  assert.equal(sightspectrum.COMPANY, 'SightSpectrum Technology Solutions')
  assert.equal(sightspectrum.CAREERS_URL, 'https://www.sightspectrum.com/careers')
  assert.equal(sightspectrum.VERIFIED_ON, '2026-07-18')
  assert.equal(sightspectrum.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(sightspectrum.extractJobs(careersHtml).length, 2)
})

test('SightSpectrum Technology Solutions run validates the official careers page and returns India jobs', async () => {
  const sightspectrum = await loadModule()
  const requestedUrls = []

  const jobs = await sightspectrum.createSightSpectrumTechnologySolutionsScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://www.sightspectrum.com/careers'])
  assert.deepEqual(jobs, [
    {
      title: 'Data Engineer',
      company: 'SightSpectrum Technology Solutions',
      department: null,
      location: 'chennai',
      city: 'chennai',
      country: 'India',
      jobId: 'data-engineer',
      requisitionId: 'data-engineer',
      sourceUrl: 'https://www.sightspectrum.com/careers#data-engineer',
      applyUrl: 'https://www.sightspectrum.com/careers#data-engineer',
      employmentType: null,
      experienceRequired: '2+ years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['SQL', 'Python', 'Spark'],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Build and manage scalable data pipelines and infrastructure to support analytics and business insights.',
      remoteStatus: 'On-site',
      source: 'sightspectrumtechnologysolutions',
      link: 'https://www.sightspectrum.com/careers#data-engineer',
      scrapedAt: '2026-07-18T00:00:00.000Z',
    },
    {
      title: 'UI/UX Designer',
      company: 'SightSpectrum Technology Solutions',
      department: null,
      location: 'Remote',
      city: 'Remote',
      country: 'India',
      jobId: 'ui-ux-designer',
      requisitionId: 'ui-ux-designer',
      sourceUrl: 'https://www.sightspectrum.com/careers#ui-ux-designer',
      applyUrl: 'https://www.sightspectrum.com/careers#ui-ux-designer',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['React', 'Vue.js', 'HTML/CSS'],
      postingDate: null,
      closingDate: null,
      jobDescription: 'We are looking for a talented Frontend Engineer to join our dynamic team.',
      remoteStatus: 'Remote',
      source: 'sightspectrumtechnologysolutions',
      link: 'https://www.sightspectrum.com/careers#ui-ux-designer',
      scrapedAt: '2026-07-18T00:00:00.000Z',
    },
  ])
})

test('SightSpectrum Technology Solutions run fails closed when the verified careers surface drifts', async () => {
  const sightspectrum = await loadModule()

  await assert.rejects(
    sightspectrum.createSightSpectrumTechnologySolutionsScraper().run({
      fetchText: async () => '<html><body><h1>SightSpectrum</h1></body></html>',
    }),
    /verified sightspectrum technology solutions careers surface/i,
  )
})
