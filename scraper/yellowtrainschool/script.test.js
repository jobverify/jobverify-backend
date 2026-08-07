import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const OPENINGS_SENTENCE = 'We are looking for Kindergarten, Primary, Waldorf Art and Senior School Subject teachers of English Literature and Economics.'

const homepageHtml = `
  <html>
    <head>
      <title>Yellow Train</title>
    </head>
    <body>
      <nav>
        <a href="/about-yellow-train">About Yellow Train</a>
        <a href="/recruitment">Recruitment</a>
        <a href="/contact-us">Contact Us</a>
      </nav>
    </body>
  </html>
`

const aboutHtml = `
  <html>
    <body>
      <h1>About Yellow Train</h1>
      <p>Yellow Train School is based in Coimbatore and follows a Waldorf-inspired approach.</p>
    </body>
  </html>
`

const recruitmentHtml = `
  <html>
    <body>
      <h1>Recruitment</h1>
      <p>${OPENINGS_SENTENCE}</p>
      <p>A commitment of minimum two years is non-negotiable.</p>
      <a href="mailto:careers@yellowtrainschool.com">careers@yellowtrainschool.com</a>
    </body>
  </html>
`

const contactHtml = `
  <html>
    <body>
      <h1>Contact Us</h1>
      <p>Yellow Train School, Coimbatore, Tamil Nadu, India</p>
      <a href="mailto:careers@yellowtrainschool.com">careers@yellowtrainschool.com</a>
    </body>
  </html>
`

test('Yellow Train School constants stay pinned to the verified homepage, recruitment, and contact contract', async () => {
  const yellowTrain = await loadModule()
  assert.ok(yellowTrain, 'Yellow Train School scraper module should load')

  assert.equal(yellowTrain.SOURCE, 'yellowtrainschool')
  assert.equal(yellowTrain.COMPANY, 'Yellow Train School')
  assert.equal(yellowTrain.HOMEPAGE_URL, 'https://www.yellowtrainschool.com/')
  assert.equal(yellowTrain.ABOUT_URL, 'https://www.yellowtrainschool.com/about-yellow-train')
  assert.equal(yellowTrain.RECRUITMENT_URL, 'https://www.yellowtrainschool.com/recruitment')
  assert.equal(yellowTrain.CONTACT_URL, 'https://www.yellowtrainschool.com/contact-us')
  assert.equal(yellowTrain.APPLY_EMAIL, 'careers@yellowtrainschool.com')
  assert.equal(yellowTrain.OPENINGS_SENTENCE, OPENINGS_SENTENCE)
  assert.equal(yellowTrain.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(yellowTrain.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(yellowTrain.hasOfficialRecruitmentSignal(recruitmentHtml), true)
  assert.equal(yellowTrain.hasOfficialContactSignal(contactHtml), true)
})

test('extractTeachingRoles expands the verified recruitment sentence into five school roles', async () => {
  const yellowTrain = await loadModule()
  assert.ok(yellowTrain, 'Yellow Train School scraper module should load')

  assert.deepEqual(yellowTrain.extractTeachingRoles(recruitmentHtml), [
    {
      title: 'Kindergarten Teacher',
      company: 'Yellow Train School',
      department: 'Teaching',
      location: 'Coimbatore, Tamil Nadu, India',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      jobId: 'yellowtrainschool-kindergarten-teacher',
      requisitionId: 'yellowtrainschool-kindergarten-teacher',
      sourceUrl: 'https://www.yellowtrainschool.com/recruitment',
      applyUrl: 'mailto:careers@yellowtrainschool.com',
      employmentType: null,
      experienceRequired: 'Minimum commitment of two years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: OPENINGS_SENTENCE,
      remoteStatus: 'On-site',
    },
    {
      title: 'Primary Teacher',
      company: 'Yellow Train School',
      department: 'Teaching',
      location: 'Coimbatore, Tamil Nadu, India',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      jobId: 'yellowtrainschool-primary-teacher',
      requisitionId: 'yellowtrainschool-primary-teacher',
      sourceUrl: 'https://www.yellowtrainschool.com/recruitment',
      applyUrl: 'mailto:careers@yellowtrainschool.com',
      employmentType: null,
      experienceRequired: 'Minimum commitment of two years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: OPENINGS_SENTENCE,
      remoteStatus: 'On-site',
    },
    {
      title: 'Waldorf Art Teacher',
      company: 'Yellow Train School',
      department: 'Teaching',
      location: 'Coimbatore, Tamil Nadu, India',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      jobId: 'yellowtrainschool-waldorf-art-teacher',
      requisitionId: 'yellowtrainschool-waldorf-art-teacher',
      sourceUrl: 'https://www.yellowtrainschool.com/recruitment',
      applyUrl: 'mailto:careers@yellowtrainschool.com',
      employmentType: null,
      experienceRequired: 'Minimum commitment of two years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: OPENINGS_SENTENCE,
      remoteStatus: 'On-site',
    },
    {
      title: 'Senior School Teacher - English Literature',
      company: 'Yellow Train School',
      department: 'Teaching',
      location: 'Coimbatore, Tamil Nadu, India',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      jobId: 'yellowtrainschool-senior-school-teacher-english-literature',
      requisitionId: 'yellowtrainschool-senior-school-teacher-english-literature',
      sourceUrl: 'https://www.yellowtrainschool.com/recruitment',
      applyUrl: 'mailto:careers@yellowtrainschool.com',
      employmentType: null,
      experienceRequired: 'Minimum commitment of two years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: OPENINGS_SENTENCE,
      remoteStatus: 'On-site',
    },
    {
      title: 'Senior School Teacher - Economics',
      company: 'Yellow Train School',
      department: 'Teaching',
      location: 'Coimbatore, Tamil Nadu, India',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      jobId: 'yellowtrainschool-senior-school-teacher-economics',
      requisitionId: 'yellowtrainschool-senior-school-teacher-economics',
      sourceUrl: 'https://www.yellowtrainschool.com/recruitment',
      applyUrl: 'mailto:careers@yellowtrainschool.com',
      employmentType: null,
      experienceRequired: 'Minimum commitment of two years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: OPENINGS_SENTENCE,
      remoteStatus: 'On-site',
    },
  ])
})

test('run validates the Yellow Train first-party chain and decorates the recruitment roles', async () => {
  const yellowTrain = await loadModule()
  assert.ok(yellowTrain, 'Yellow Train School scraper module should load')

  const requestedUrls = []
  const jobs = await yellowTrain.createYellowTrainSchoolScraper({ maxJobs: 3 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === yellowTrain.HOMEPAGE_URL) return homepageHtml
      if (url === yellowTrain.ABOUT_URL) return aboutHtml
      if (url === yellowTrain.RECRUITMENT_URL) return recruitmentHtml
      if (url === yellowTrain.CONTACT_URL) return contactHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-12T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    yellowTrain.HOMEPAGE_URL,
    yellowTrain.ABOUT_URL,
    yellowTrain.RECRUITMENT_URL,
    yellowTrain.CONTACT_URL,
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'yellowtrainschool')
  assert.equal(jobs[0].link, 'mailto:careers@yellowtrainschool.com')
  assert.equal(jobs[0].scrapedAt, '2026-07-12T00:00:00.000Z')
})

test('run fails closed when the homepage, recruitment sentence, contact email, or contact identity changes', async () => {
  const yellowTrain = await loadModule()
  assert.ok(yellowTrain, 'Yellow Train School scraper module should load')

  await assert.rejects(
    yellowTrain.createYellowTrainSchoolScraper().run({
      fetchText: async (url) => {
        if (url === yellowTrain.HOMEPAGE_URL) return '<html><body><a href="/about-yellow-train">About</a></body></html>'
        return recruitmentHtml
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    yellowTrain.createYellowTrainSchoolScraper().run({
      fetchText: async (url) => {
        if (url === yellowTrain.HOMEPAGE_URL) return homepageHtml
        if (url === yellowTrain.ABOUT_URL) return aboutHtml
        if (url === yellowTrain.RECRUITMENT_URL) {
          return recruitmentHtml.replace(OPENINGS_SENTENCE, 'We welcome passionate teachers.')
        }
        return contactHtml
      },
    }),
    /official recruitment page/i,
  )

  await assert.rejects(
    yellowTrain.createYellowTrainSchoolScraper().run({
      fetchText: async (url) => {
        if (url === yellowTrain.HOMEPAGE_URL) return homepageHtml
        if (url === yellowTrain.ABOUT_URL) return aboutHtml
        if (url === yellowTrain.RECRUITMENT_URL) {
          return recruitmentHtml.replaceAll('careers@yellowtrainschool.com', 'hello@example.com')
        }
        return contactHtml
      },
    }),
    /official recruitment page/i,
  )

  await assert.rejects(
    yellowTrain.createYellowTrainSchoolScraper().run({
      fetchText: async (url) => {
        if (url === yellowTrain.HOMEPAGE_URL) return homepageHtml
        if (url === yellowTrain.ABOUT_URL) return aboutHtml
        if (url === yellowTrain.RECRUITMENT_URL) return recruitmentHtml
        return '<html><body><p>Contact us later.</p></body></html>'
      },
    }),
    /official contact page/i,
  )
})
