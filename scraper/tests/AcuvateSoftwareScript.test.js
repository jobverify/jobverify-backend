import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Culture & Careers | Acuvate</title>
  </head>
  <body>
    <h2>Open Opportunities at Acuvate</h2>
    <section class="role-card">
      <h3 class="elementor-heading-title">Project Manager</h3>
      <div class="panel-location"><strong>Location:</strong> Hyderabad</div>
      <div class="panel-location"><strong>Experience:</strong> 5+ years</div>
      <div class="panel-experience"><strong>Job Type:</strong> Full Time</div>
      <a class="elementor-button" href="#fill_the_form">Apply Now</a>
    </section>
    <section class="role-card">
      <h3 class="elementor-heading-title">CUX Designer</h3>
      <div class="panel-location"><strong>Location:</strong> Hyderabad</div>
      <div class="panel-location"><strong>Experience:</strong> 2-5 years years</div>
      <div class="panel-experience"><strong>Job Type:</strong> Permanent</div>
      <a class="elementor-button" href="#fill_the_form">Apply Now</a>
    </section>
    <section class="role-card">
      <h3 class="elementor-heading-title">Agentic AI Architect</h3>
      <div class="panel-location"><strong>Location:</strong> Hyderabad</div>
      <div class="panel-location"><strong>Department:</strong> AI & Emerging Technologies</div>
      <div class="panel-location"><strong>Experience:</strong> 4+ years in AI/ML with agentic & Generative AI focus</div>
      <div class="panel-experience"><strong>Job Type:</strong> Full-Time</div>
      <a class="elementor-button" href="#fill_the_form">Apply Now</a>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../acuvatesoftware/script.js')
  } catch {
    assert.fail('Expected Acuvate Software scraper module at ../acuvatesoftware/script.js')
  }
}

test('Acuvate Software helpers stay pinned to the verified first-party careers roles from Friday, July 17, 2026', async () => {
  const acuvate = await loadModule()

  assert.equal(acuvate.SOURCE, 'acuvatesoftware')
  assert.equal(acuvate.COMPANY, 'Acuvate Software')
  assert.equal(acuvate.CAREERS_URL, 'https://acuvate.com/careers/')
  assert.equal(acuvate.APPLY_URL, 'https://acuvate.com/careers/#fill_the_form')
  assert.equal(acuvate.VERIFIED_ON, '2026-07-17')
  assert.equal(acuvate.hasOfficialCareersSignal(verifiedCareersHtml), true)
  assert.equal(acuvate.hasOfficialCareersSignal('<html><body><h1>Careers</h1></body></html>'), false)
  assert.deepEqual(acuvate.extractJobs(verifiedCareersHtml), [
    {
      title: 'Project Manager',
      company: 'Acuvate Software',
      department: null,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'project-manager',
      requisitionId: 'project-manager',
      sourceUrl: 'https://acuvate.com/careers/',
      applyUrl: 'https://acuvate.com/careers/#fill_the_form',
      employmentType: 'Full Time',
      experienceRequired: '5+ years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'CUX Designer',
      company: 'Acuvate Software',
      department: null,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'cux-designer',
      requisitionId: 'cux-designer',
      sourceUrl: 'https://acuvate.com/careers/',
      applyUrl: 'https://acuvate.com/careers/#fill_the_form',
      employmentType: 'Permanent',
      experienceRequired: '2-5 years years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Agentic AI Architect',
      company: 'Acuvate Software',
      department: 'AI & Emerging Technologies',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'agentic-ai-architect',
      requisitionId: 'agentic-ai-architect',
      sourceUrl: 'https://acuvate.com/careers/',
      applyUrl: 'https://acuvate.com/careers/#fill_the_form',
      employmentType: 'Full-Time',
      experienceRequired: '4+ years in AI/ML with agentic & Generative AI focus',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('Acuvate Software run validates the verified careers page before decorating extracted jobs', async () => {
  const acuvate = await loadModule()
  const requestedUrls = []

  const jobs = await acuvate.createAcuvateSoftwareScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === acuvate.CAREERS_URL) return verifiedCareersHtml
      throw new Error(`Unexpected Acuvate URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [acuvate.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'acuvatesoftware')
  assert.equal(jobs[0].link, 'https://acuvate.com/careers/#fill_the_form')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Acuvate Software run fails closed when the verified careers surface drifts', async () => {
  const acuvate = await loadModule()

  await assert.rejects(
    acuvate.createAcuvateSoftwareScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified acuvate software careers surface/i,
  )
})
