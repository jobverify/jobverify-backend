import assert from 'node:assert/strict'
import test from 'node:test'

const loadQubeCinemaModule = async () => {
  try {
    return await import('../qubecinema/script.js')
  } catch {
    return null
  }
}

const officialCareersHtml = `
<!doctype html>
<html>
  <head>
    <title>Qube Careers</title>
  </head>
  <body>
    <h1>Welcome to Qube Careers</h1>
    <section>
      <h2>JOBS</h2>
      <p>If so, qube wants to hear from you!</p>
      <a href="https://qubecinema.applytojob.com/">VIEW JOBS</a>
      <a href="https://qubecinema.applytojob.com/">VIEW JOBS</a>
      <a href="https://qubecinema.applytojob.com/">VIEW JOBS</a>
    </section>
  </body>
</html>
`

const boardHtml = `
<!doctype html>
<html>
  <head>
    <title>Qube Cinema - Career Page</title>
  </head>
  <body>
    <a href="https://www.qubecinema.com">View Our Website</a>
    <h2>Current Openings</h2>
    <ul>
      <li>
        <h3><a href="/apply/AdOps01/Ad-Operations-Executive">Ad Operations Executive</a></h3>
        <div>Chennai, India</div>
      </li>
      <li>
        <h3><a href="/apply/U2WXOmR469/Senior-Golang-Developer">Senior Golang Developer</a></h3>
        <div>Remote</div>
        <div>Product Engineering</div>
      </li>
      <li>
        <h3><a href="/apply/N7n5aXXsLc/AI-Engineer-Digital-Transformation">AI Engineer - Digital Transformation</a></h3>
        <div>Chennai, India</div>
        <div>Qube Labs</div>
      </li>
      <li>
        <h3><a href="/apply/Global01/Freelance-Subtitle-Writers">Freelance Subtitle Writers</a></h3>
        <div>Multiple Countries</div>
        <div>Localization</div>
      </li>
    </ul>
    <a href="https://info.jazzhr.com">Powered by</a>
  </body>
</html>
`

const detailPageHtml = `
<!doctype html>
<html>
  <head>
    <title>Ad Operations Executive - Career Page</title>
  </head>
  <body>
    <div class='job-header'>
      <h2>Ad Operations Executive</h2>
      <div class="job-attributes-container">
        <div title="Location"><i class='fa fa-map-marker'></i>Chennai, India</div>
        <div id='resumator-job-employment' title="Type"><i class='fa fa-clock-o'></i>Full Time</div>
        <div id='resumator-job-experience' title="Experience"><i class='fa fa-graduation-cap'></i>Entry Level</div>
      </div>
    </div>
    <div class='page-body job-details'>
      <div class='container'>
        <div class='row'>
          <div class='col col-xs-7 description' id="job-description">
            <p><strong>Job Title: Ad Operations Executive</strong></p>
            <p><strong>Location: Chennai<br>Experience: 2&#8211;3 Years</strong></p>
            <p><strong>Role Summary:</strong><br>Looking for an Ad Operations Executive to manage ad scheduling, delivery, and playback across cinema screens using internal systems.</p>
            <p><strong>Requirements:</strong></p>
            <ul>
              <li>2&#8211;3 years in Media Ops / Ad Ops / Content Delivery</li>
              <li>Strong attention to detail and problem-solving skills</li>
            </ul>
          </div>
          <button type="button" id="resumator-mobile-apply-button" class='btn'>Apply</button>
        </div>
      </div>
    </div>
  </body>
</html>
`

test('validates the official Qube careers page and public ApplyToJob board handoff', async () => {
  const qubecinema = await loadQubeCinemaModule()
  assert.ok(qubecinema)

  assert.equal(qubecinema.CAREERS_URL, 'https://www.qubecinema.com/careers')
  assert.equal(qubecinema.BOARD_URL, 'https://qubecinema.applytojob.com/')
  assert.equal(qubecinema.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(qubecinema.hasOfficialCareersSignal('<main>Careers</main>'), false)
  assert.equal(qubecinema.hasVerifiedBoardSignal(boardHtml), true)
  assert.equal(qubecinema.hasVerifiedBoardSignal('<main>No board links</main>'), false)
})

test('extractBoardJobs keeps India and remote Qube roles from the public board', async () => {
  const qubecinema = await loadQubeCinemaModule()
  assert.ok(qubecinema)

  assert.deepEqual(qubecinema.extractBoardJobs(boardHtml), [
    {
      title: 'Ad Operations Executive',
      company: 'Qube Cinema',
      department: null,
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'AdOps01',
      requisitionId: 'AdOps01',
      sourceUrl: 'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
      applyUrl: 'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Senior Golang Developer',
      company: 'Qube Cinema',
      department: 'Product Engineering',
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId: 'U2WXOmR469',
      requisitionId: 'U2WXOmR469',
      sourceUrl: 'https://qubecinema.applytojob.com/apply/U2WXOmR469/Senior-Golang-Developer',
      applyUrl: 'https://qubecinema.applytojob.com/apply/U2WXOmR469/Senior-Golang-Developer',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Remote',
    },
    {
      title: 'AI Engineer - Digital Transformation',
      company: 'Qube Cinema',
      department: 'Qube Labs',
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'N7n5aXXsLc',
      requisitionId: 'N7n5aXXsLc',
      sourceUrl: 'https://qubecinema.applytojob.com/apply/N7n5aXXsLc/AI-Engineer-Digital-Transformation',
      applyUrl: 'https://qubecinema.applytojob.com/apply/N7n5aXXsLc/AI-Engineer-Digital-Transformation',
      employmentType: null,
      experienceRequired: null,
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

test('extractJobDetail reads experienceRequired from the public Qube ApplyToJob detail page', async () => {
  const qubecinema = await loadQubeCinemaModule()
  assert.ok(qubecinema)

  assert.deepEqual(
    qubecinema.extractJobDetail(detailPageHtml, {
      title: 'Ad Operations Executive',
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'AdOps01',
      requisitionId: 'AdOps01',
      sourceUrl: 'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
      applyUrl: 'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
      department: null,
      remoteStatus: 'On-site',
    }),
    {
      title: 'Ad Operations Executive',
      company: 'Qube Cinema',
      department: null,
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'AdOps01',
      requisitionId: 'AdOps01',
      sourceUrl: 'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
      applyUrl: 'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
      employmentType: 'Full Time',
      experienceRequired: '2-3 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        '2-3 years in Media Ops / Ad Ops / Content Delivery',
        'Strong attention to detail and problem-solving skills',
      ],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Job Title: Ad Operations Executive Location: Chennai Experience: 2-3 Years Role Summary: Looking for an Ad Operations Executive to manage ad scheduling, delivery, and playback across cinema screens using internal systems. Requirements: 2-3 years in Media Ops / Ad Ops / Content Delivery Strong attention to detail and problem-solving skills',
      remoteStatus: 'On-site',
    },
  )
})

test('run validates both verified Qube surfaces before decorating extracted jobs', async () => {
  const qubecinema = await loadQubeCinemaModule()
  assert.ok(qubecinema)

  const requestedUrls = []
  const jobs = await qubecinema.createQubeCinemaScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === qubecinema.CAREERS_URL) return officialCareersHtml
      if (url === qubecinema.BOARD_URL) return boardHtml
      if (url === 'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive') return detailPageHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    qubecinema.CAREERS_URL,
    qubecinema.BOARD_URL,
    'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'qubecinema')
  assert.equal(
    jobs[0].link,
    'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
  )
  assert.equal(jobs[0].experienceRequired, '2-3 years')
  assert.equal(jobs[0].employmentType, 'Full Time')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('run fails closed when the official Qube careers page no longer matches the verified surface', async () => {
  const qubecinema = await loadQubeCinemaModule()
  assert.ok(qubecinema)

  await assert.rejects(
    qubecinema.createQubeCinemaScraper().run({
      fetchText: async (url) => (url === qubecinema.CAREERS_URL ? '<html><body>Careers</body></html>' : boardHtml),
    }),
    /official Qube careers page/i,
  )
})

test('run fails closed when the public Qube ApplyToJob board no longer matches the verified surface', async () => {
  const qubecinema = await loadQubeCinemaModule()
  assert.ok(qubecinema)

  await assert.rejects(
    qubecinema.createQubeCinemaScraper().run({
      fetchText: async (url) => (url === qubecinema.CAREERS_URL ? officialCareersHtml : '<html><body>Jobs</body></html>'),
    }),
    /verified Qube ApplyToJob board/i,
  )
})
