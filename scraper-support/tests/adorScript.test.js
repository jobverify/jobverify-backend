import assert from 'node:assert/strict'
import test from 'node:test'

const loadAdorModule = async () => {
  try {
    return await import('../../scraper/ador/script.js')
  } catch {
    assert.fail('Expected ADOR scraper module at ../../scraper/scraper/ador/script.js')
  }
}

const sampleHtml = `
<section class="careers_list section pt-0">
  <div class="container-xl">
    <div id="viewjob" class="accordion-full py-4">
      <div class="job-item mb-3 p-3 rounded">
        <div class="d-md-flex justify-content-between align-items-center">
          <div class="show-header">
            <h5 class="job-title mb-0">Area Sales Engineer / Assistant Manager / Deputy Manager – Welding Consumables</h5>
            <p class="my-1">Bangalore / Baroda / Gandhidham / Surat / Hyderabad / Mumbai / Vadodara / Ahmedabad</p>
          </div>
          <div class="btn-show">
            <a class="btn btn-primary" href="https://adorwelding.com/careers/job-apply?job_id=19054" target="_blank">Apply Now</a>
          </div>
        </div>
        <div id="job-details-19054" class="collapse mt-3 job-details" data-bs-parent="#viewjob">
          <p>Location: Bangalore / Baroda / Gandhidham / Surat / Hyderabad / Mumbai / Vadodara / Ahmedabad</p>
          <p>Years of experience: 2–6 years of experience in Selling / Marketing of Welding Products or Allied Products in a medium or large organization.</p>
          <p>Qualification : Degree / Diploma in Electrical / Electronic Engineering / Mechanical Engineering.</p>
          <p>Job profile requirements:</p>
          <p><p>Overall responsibility for driving sales, customer engagement, and business growth in the assigned territory.</p></p>
          <a class="btn btn-primary" href="https://adorwelding.com/careers/job-apply?job_id=19054" target="_blank">Apply Now</a>
        </div>
      </div>
      <div class="job-item mb-3 p-3 rounded">
        <div class="d-md-flex justify-content-between align-items-center">
          <div class="show-header">
            <h5 class="job-title mb-0">Senior Quality Team Member &#8211; Welding Consumables</h5>
            <p class="my-1">Silvassa ( Dadra &amp; Nagar Haveli )</p>
          </div>
          <div class="btn-show">
            <a class="btn btn-primary" href="https://adorwelding.com/careers/job-apply?job_id=18921" target="_blank">Apply Now</a>
          </div>
        </div>
        <div id="job-details-18921" class="collapse mt-3 job-details" data-bs-parent="#viewjob">
          <p>Location: Silvassa ( Dadra &amp; Nagar Haveli )</p>
          <p>Years of experience: 12 to 18 years</p>
          <p>Qualification : B.Tech/ MTech/ IIT</p>
          <p>Job profile requirements:</p>
          <p><ul><li>Oversee quality for welding consumables.</li></ul></p>
          <a class="btn btn-primary" href="https://adorwelding.com/careers/job-apply?job_id=18921" target="_blank">Apply Now</a>
        </div>
      </div>
    </div>
  </div>
</section>
`

test('extractSearchResults maps ADOR careers cards into conservative job records', async () => {
  const ador = await loadAdorModule()
  const jobs = ador.extractSearchResults(sampleHtml)

  assert.equal(ador.pageIndicatesJobCards(sampleHtml), true)
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Area Sales Engineer / Assistant Manager / Deputy Manager - Welding Consumables',
    company: 'ADOR',
    department: 'Area Sales Engineer / Assistant Manager / Deputy Manager - Welding Consumables',
    location: 'Bangalore / Baroda / Gandhidham / Surat / Hyderabad / Mumbai / Vadodara / Ahmedabad, India',
    city: null,
    country: 'India',
    jobId: 'ador-19054',
    requisitionId: '19054',
    sourceUrl: 'https://adorwelding.com/careers/',
    applyUrl: 'https://adorwelding.com/careers/job-apply?job_id=19054',
    employmentType: null,
    experienceRequired: '2-6 years of experience in Selling / Marketing of Welding Products or Allied Products in a medium or large organization.',
    minimumQualification: 'Degree / Diploma in Electrical / Electronic Engineering / Mechanical Engineering.',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Location: Bangalore / Baroda / Gandhidham / Surat / Hyderabad / Mumbai / Vadodara / Ahmedabad Years of experience: 2-6 years of experience in Selling / Marketing of Welding Products or Allied Products in a medium or large organization. Qualification : Degree / Diploma in Electrical / Electronic Engineering / Mechanical Engineering. Job profile requirements: Overall responsibility for driving sales, customer engagement, and business growth in the assigned territory. Apply via the ADOR careers page.',
  })
  assert.deepEqual(jobs[1], {
    title: 'Senior Quality Team Member - Welding Consumables',
    company: 'ADOR',
    department: 'Senior Quality Team Member - Welding Consumables',
    location: 'Silvassa ( Dadra & Nagar Haveli ), India',
    city: 'Silvassa ( Dadra & Nagar Haveli )',
    country: 'India',
    jobId: 'ador-18921',
    requisitionId: '18921',
    sourceUrl: 'https://adorwelding.com/careers/',
    applyUrl: 'https://adorwelding.com/careers/job-apply?job_id=18921',
    employmentType: null,
    experienceRequired: '12 to 18 years',
    minimumQualification: 'B.Tech/ MTech/ IIT',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Location: Silvassa ( Dadra & Nagar Haveli ) Years of experience: 12 to 18 years Qualification : B.Tech/ MTech/ IIT Job profile requirements: Oversee quality for welding consumables. Apply via the ADOR careers page.',
  })
})

test('run fetches the ADOR careers page and decorates the extracted openings', async () => {
  const ador = await loadAdorModule()
  const requestedUrls = []
  const scraper = ador.createAdorScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return sampleHtml
    },
  })

  assert.equal(ador.buildSearchUrl(), ador.CAREER_PAGE_URL)
  assert.deepEqual(requestedUrls, [ador.CAREER_PAGE_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'ador')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
