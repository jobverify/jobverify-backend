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

test('run validates both verified Qube surfaces before decorating extracted jobs', async () => {
  const qubecinema = await loadQubeCinemaModule()
  assert.ok(qubecinema)

  const requestedUrls = []
  const jobs = await qubecinema.createQubeCinemaScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === qubecinema.CAREERS_URL) return officialCareersHtml
      if (url === qubecinema.BOARD_URL) return boardHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [qubecinema.CAREERS_URL, qubecinema.BOARD_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'qubecinema')
  assert.equal(
    jobs[0].link,
    'https://qubecinema.applytojob.com/apply/AdOps01/Ad-Operations-Executive',
  )
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
