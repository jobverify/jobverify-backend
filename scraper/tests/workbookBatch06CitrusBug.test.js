import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../workbookbatch06/citrusbug.js')
  } catch {
    assert.fail('Expected CitrusBug scraper module at ../workbookbatch06/citrusbug.js')
  }
}

const roleHtml = ({
  title,
  experience,
  description,
  qualifications,
}) => `
  <section class="job-card">
    <h3>${title}</h3>
    <p>Ahmedabad &bull; Onsite &bull; ${experience}</p>
    <button type="button">View Details</button>
    <a href="#apply-for-job">Apply Now</a>
    <h4>Job Description</h4>
    <p>${description}</p>
    <h4>Opportunity</h4>
    <ul>
      <li>Competitive salary package</li>
      <li>5-day working culture</li>
    </ul>
    <h4>Responsibilities</h4>
    <ul>
      <li>Core responsibilities stay on the official careers page.</li>
    </ul>
    <h4>Qualifications</h4>
    <p>${qualifications}</p>
  </section>
`

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>CitrusBug Careers</title>
  </head>
  <body>
    <main>
      <h1>Join Our Team</h1>
      <p>At Citrusbug Technolabs, the world’s most talented engineers, designers, and thought leaders are shaping the future of online publishing.</p>
      <h2>Life @ Citrusbug Technolabs</h2>
      <p>The Citrusbug Technolabs offers its employees the perfect opportunities to grow while enjoying themselves, leading to wholesome work experience..</p>
      <h2>Open Positions</h2>
      ${roleHtml({
        title: 'Digital Marketing (Sr level)',
        experience: '5+ Years',
        description: 'We are looking for a motivated and creative Digital Marketing to manage our social media presence and enhance online reputation management (ORM).',
        qualifications: 'Any Graduate',
      })}
      ${roleHtml({
        title: 'Executive Assistant (EA) to CEO',
        experience: '3 - 5Years',
        description: 'We are looking for a highly organized and proactive Executive Assistant to the CEO to manage executive schedules, coordinate with leadership teams, and ensure smooth execution of daily business priorities.',
        qualifications: 'Bachelor’s / Master’s degree (Any)',
      })}
      ${roleHtml({
        title: 'Sales Head - IT Services',
        experience: '8-10 Years',
        description: 'We are looking for an experienced Sales Head - IT Services with strong expertise in AI/ML and enterprise IT solutions sales.',
        qualifications: 'Bachelor’s degree in Engineering / IT / Business / Any Graduate | Strong experience in enterprise and consultative selling',
      })}
      <h2>Shape Your Career With Us!</h2>
      <p>Discover our latest job openings that match your skills and ambitions.</p>
      <p>Email jobs@citrusbug.co</p>
      <p>Phone +91 8128442240</p>
      <h2 id="apply-for-job">Apply for Job</h2>
      <label>Position Applying For</label>
      <select>
        <option>Digital Marketing (Sr level)</option>
        <option>Executive Assistant (EA) to CEO</option>
        <option>Sales Head - IT Services</option>
      </select>
      <label>Upload Resume</label>
      <label>Willing to relocate to Ahmedabad ?</label>
    </main>
  </body>
</html>
`

test('CitrusBug validates the verified first-party careers shell and extracts the public Ahmedabad roles', async () => {
  const citrusbug = await loadModule()
  const roles = citrusbug.extractRoleCards(VERIFIED_CAREERS_HTML)

  assert.equal(citrusbug.SOURCE, 'citrusbug')
  assert.equal(citrusbug.COMPANY, 'CitrusBug')
  assert.equal(citrusbug.VERIFIED_ON, '2026-07-25')
  assert.equal(citrusbug.CAREERS_URL, 'https://citrusbug.com/career/')
  assert.equal(
    citrusbug.DISPOSITION,
    'verified-first-party-careers-page-plus-public-same-page-application-form',
  )
  assert.match(citrusbug.VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(citrusbug.VERIFIED_SURFACE_SUMMARY, /https:\/\/citrusbug\.com\/career\//i)
  assert.match(citrusbug.VERIFIED_SURFACE_SUMMARY, /Digital Marketing \(Sr level\)/i)
  assert.match(citrusbug.VERIFIED_SURFACE_SUMMARY, /jobs@citrusbug\.co/i)
  assert.equal(citrusbug.hasOfficialCareersPageSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(citrusbug.hasApplicationFormSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(roles.length, 3)
  assert.deepEqual(roles[1], {
    title: 'Executive Assistant (EA) to CEO',
    experienceRequired: '3-5 Years',
    jobDescription: 'We are looking for a highly organized and proactive Executive Assistant to the CEO to manage executive schedules, coordinate with leadership teams, and ensure smooth execution of daily business priorities.',
    minimumQualification: "Bachelor's / Master's degree (Any)",
  })
})

test('CitrusBug run returns the verified public Ahmedabad roles from the same-page careers contract', async () => {
  const citrusbug = await loadModule()

  const jobs = await citrusbug.createCitrusBugScraper().run({
    fetchText: async (url) => {
      assert.equal(url, citrusbug.CAREERS_URL)
      return VERIFIED_CAREERS_HTML
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Digital Marketing (Sr level)',
      'Executive Assistant (EA) to CEO',
      'Sales Head - IT Services',
    ],
  )
  assert.deepEqual(jobs[0], {
    title: 'Digital Marketing (Sr level)',
    company: 'CitrusBug',
    department: null,
    location: 'Ahmedabad, India',
    city: 'Ahmedabad',
    country: 'India',
    jobId: 'digital-marketing-sr-level',
    requisitionId: 'digital-marketing-sr-level',
    sourceUrl: 'https://citrusbug.com/career/',
    applyUrl: 'https://citrusbug.com/career/',
    employmentType: null,
    experienceRequired: '5+ Years',
    minimumQualification: 'Any Graduate',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'We are looking for a motivated and creative Digital Marketing to manage our social media presence and enhance online reputation management (ORM).',
    source: 'citrusbug',
    link: 'https://citrusbug.com/career/',
    scrapedAt: '2026-07-25T00:00:00.000Z',
  })
})

test('CitrusBug fails closed when the verified careers shell or same-page application contract drifts', async () => {
  const citrusbug = await loadModule()

  await assert.rejects(
    citrusbug.run({
      fetchText: async () => `
        <html>
          <body>
            <main>
              <h1>Careers</h1>
              <p>Join us.</p>
            </main>
          </body>
        </html>
      `,
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    citrusbug.run({
      fetchText: async () => VERIFIED_CAREERS_HTML.replace('Upload Resume', 'Share Portfolio'),
    }),
    /same-page application form/i,
  )
})

test('CitrusBug fails closed when the official careers page exposes a different public jobs surface', async () => {
  const citrusbug = await loadModule()

  await assert.rejects(
    citrusbug.run({
      fetchText: async () => `
        ${VERIFIED_CAREERS_HTML}
        <a href="https://boards.greenhouse.io/citrusbug">Greenhouse board</a>
      `,
    }),
    /different public jobs surface/i,
  )

  await assert.rejects(
    citrusbug.run({
      fetchText: async () => `
        ${VERIFIED_CAREERS_HTML}
        <a href="/careers/founding-ai-engineer">Founding AI Engineer</a>
      `,
    }),
    /different public jobs surface/i,
  )
})
