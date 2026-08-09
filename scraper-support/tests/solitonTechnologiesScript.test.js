import assert from 'node:assert/strict'
import test from 'node:test'

const loadSolitonModule = async () => {
  try {
    return await import('../../scraper/solitontechnologies/script.js')
  } catch {
    assert.fail('Expected Soliton Technologies scraper module at ../../scraper/solitontechnologies/script.js')
  }
}

const listingHtml = `
  <html>
    <head>
      <title>Job Openings | Soliton Technologies | Apply Now</title>
    </head>
    <body>
      <h2>CAREER OPPORTUNITIES WITH SOLITON</h2>
      <div class="job-card">
        <h4>Senior Embedded Engineer</h4>
        <p>We are looking for a Senior Embedded Engineer with 3-5 years of experience to design and develop embedded software.</p>
        <a href="https://www.solitontech.com/jobs/senior-embedded-engineer/">VIEW JOB DETAILS</a>
      </div>
      <div class="job-card">
        <h4>Senior Project Engineer - Python</h4>
        <p>Design and implement software for multiple platforms.</p>
        <a href="/jobs/senior-project-engineer-python/">VIEW JOB DETAILS</a>
      </div>
    </body>
  </html>
`

const detailHtml = `
  <html>
    <head>
      <title>Senior Embedded Engineer | Soliton Technologies</title>
    </head>
    <body>
      <h1>Senior Embedded Engineer</h1>
      <h4>Summary:</h4>
      <p>We are looking for a Senior Embedded Engineer with 3-5 years of experience to design and develop embedded software/firmware for IOT and Robotic solutions.</p>
      <h4>Key Responsibilities:</h4>
      <ul>
        <li>Design and develop embedded firmware using Embedded C/C++.</li>
        <li>Develop and integrate communication interfaces like UART, SPI, I2C, USB, PCIe, Ethernet.</li>
      </ul>
      <h4>Qualification:</h4>
      <ul>
        <li>Strong programming skills in Embedded C/C++/Python.</li>
        <li>Working Experience with Linux/RTOS.</li>
      </ul>
      <h4>Additional Details:</h4>
      <ul>
        <li>Work Location (Bangalore/Coimbatore/Chennai): This role will require working from the office for the first 12 months.</li>
      </ul>
      <div class="apply"><button>APPLY NOW</button></div>
    </body>
  </html>
`

test('Soliton Technologies validates the official careers surface and extracts public detail links', async () => {
  const soliton = await loadSolitonModule()

  assert.equal(soliton.CAREER_PAGE_URL, 'https://www.solitontech.com/job-openings/')
  assert.equal(typeof soliton.hasOfficialCareersSignal, 'function')
  assert.equal(typeof soliton.extractListings, 'function')
  assert.equal(typeof soliton.extractJobDetail, 'function')
  assert.equal(typeof soliton.createSolitonTechnologiesScraper, 'function')
  assert.equal(typeof soliton.run, 'function')

  assert.equal(soliton.hasOfficialCareersSignal(listingHtml), true)

  assert.deepEqual(soliton.extractListings(listingHtml), [
    {
      title: 'Senior Embedded Engineer',
      company: 'Soliton Technologies',
      jobId: 'senior-embedded-engineer',
      requisitionId: 'senior-embedded-engineer',
      sourceUrl: 'https://www.solitontech.com/jobs/senior-embedded-engineer/',
      applyUrl: 'https://www.solitontech.com/jobs/senior-embedded-engineer/',
      jobDescription: 'We are looking for a Senior Embedded Engineer with 3-5 years of experience to design and develop embedded software.',
    },
    {
      title: 'Senior Project Engineer - Python',
      company: 'Soliton Technologies',
      jobId: 'senior-project-engineer-python',
      requisitionId: 'senior-project-engineer-python',
      sourceUrl: 'https://www.solitontech.com/jobs/senior-project-engineer-python/',
      applyUrl: 'https://www.solitontech.com/jobs/senior-project-engineer-python/',
      jobDescription: 'Design and implement software for multiple platforms.',
    },
  ])
})

test('extractJobDetail maps Soliton detail pages into shared scraper fields', async () => {
  const soliton = await loadSolitonModule()

  const listing = soliton.extractListings(listingHtml)[0]
  const detail = soliton.extractJobDetail(detailHtml, listing)

  assert.equal(detail.title, 'Senior Embedded Engineer')
  assert.equal(detail.company, 'Soliton Technologies')
  assert.equal(detail.location, 'Bangalore/Coimbatore/Chennai, India')
  assert.equal(detail.city, 'Bangalore')
  assert.equal(detail.country, 'India')
  assert.equal(detail.applyUrl, 'https://www.solitontech.com/jobs/senior-embedded-engineer/')
  assert.equal(detail.experienceRequired, '3-5 years')
  assert.match(detail.jobDescription, /embedded firmware using Embedded C\/C\+\+/i)
  assert.match(detail.jobDescription, /UART, SPI, I2C, USB, PCIe, Ethernet/i)
  assert.equal(detail.minimumQualification, 'Strong programming skills in Embedded C/C++/Python.')
})

test('run fetches Soliton listing and detail pages and decorates runner fields', async () => {
  const soliton = await loadSolitonModule()
  const requestedUrls = []

  const jobs = await soliton.createSolitonTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === soliton.CAREER_PAGE_URL) return listingHtml
      if (url === 'https://www.solitontech.com/jobs/senior-embedded-engineer/') return detailHtml
      if (url === 'https://www.solitontech.com/jobs/senior-project-engineer-python/') return detailHtml.replaceAll(
        'Senior Embedded Engineer',
        'Senior Project Engineer - Python',
      )

      throw new Error(`Unexpected Soliton URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.solitontech.com/job-openings/',
    'https://www.solitontech.com/jobs/senior-embedded-engineer/',
    'https://www.solitontech.com/jobs/senior-project-engineer-python/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'solitontechnologies')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('run fails closed when the Soliton official careers surface changes', async () => {
  const soliton = await loadSolitonModule()

  await assert.rejects(
    () => soliton.createSolitonTechnologiesScraper().run({
      fetchText: async () => '<html><body>No job board here</body></html>',
    }),
    /Soliton official careers surface changed/i,
  )
})
