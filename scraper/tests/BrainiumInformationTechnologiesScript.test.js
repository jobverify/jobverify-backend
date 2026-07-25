import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Brainium | Join Our Team</title>
  </head>
  <body>
    <main>
      <h1>Build AI-First. Work with people who care about craft.</h1>
      <p>150+ Engineers on the team</p>
      <p>Kolkata Headquarters, India</p>
      <section>
        <h2>Open Positions</h2>
        <article class="brainium-role-card">
          <h3>Senior Full-Stack Engineer</h3>
          <p class="department">Engineering</p>
          <p class="skills">React / Next.js | Node.js | TypeScript</p>
          <p class="location">Kolkata</p>
          <p class="employment-type">Full-time</p>
          <a href="https://www.brainiuminfotech.com/careers#apply-senior-full-stack-engineer">Apply now</a>
        </article>
        <article class="brainium-role-card">
          <h3>AI / ML Engineer</h3>
          <p class="department">AI &amp; Data</p>
          <p class="skills">Python | PyTorch | LangChain | LLM integration</p>
          <p class="location">Kolkata</p>
          <p class="employment-type">Full-time</p>
          <a href="https://www.brainiuminfotech.com/careers#apply-ai-ml-engineer">Apply now</a>
        </article>
        <article class="brainium-role-card">
          <h3>Senior DevOps / Platform Engineer</h3>
          <p class="department">Cloud &amp; DevOps</p>
          <p class="skills">Kubernetes | Terraform | AWS / Azure | GitHub Actions</p>
          <p class="location">Kolkata</p>
          <p class="employment-type">Full-time</p>
          <a href="https://www.brainiuminfotech.com/careers#apply-senior-devops-platform-engineer">Apply now</a>
        </article>
      </section>
      <section>
        <h2>We're Hiring</h2>
        <p>We respond to every application within 5 business days.</p>
      </section>
    </main>
  </body>
</html>
`

const loadBrainiumModule = async () => {
  try {
    return await import('../brainiuminformationtechnologies/script.js')
  } catch {
    assert.fail('Expected Brainium Information Technologies scraper module at ../brainiuminformationtechnologies/script.js')
  }
}

test('Brainium Information Technologies extracts first-party open roles from the verified careers page', async () => {
  const brainium = await loadBrainiumModule()

  assert.equal(brainium.hasOfficialBrainiumCareersSignals(careersHtml), true)
  assert.deepEqual(brainium.extractRoleCards(careersHtml), [
    {
      title: 'Senior Full-Stack Engineer',
      department: 'Engineering',
      skills: ['React / Next.js', 'Node.js', 'TypeScript'],
      location: 'Kolkata, India',
      city: 'Kolkata',
      country: 'India',
      employmentType: 'Full-time',
      applyUrl: 'https://www.brainiuminfotech.com/careers#apply-senior-full-stack-engineer',
      sourceUrl: 'https://www.brainiuminfotech.com/careers#apply-senior-full-stack-engineer',
      jobId: 'senior-full-stack-engineer',
    },
    {
      title: 'AI / ML Engineer',
      department: 'AI & Data',
      skills: ['Python', 'PyTorch', 'LangChain', 'LLM integration'],
      location: 'Kolkata, India',
      city: 'Kolkata',
      country: 'India',
      employmentType: 'Full-time',
      applyUrl: 'https://www.brainiuminfotech.com/careers#apply-ai-ml-engineer',
      sourceUrl: 'https://www.brainiuminfotech.com/careers#apply-ai-ml-engineer',
      jobId: 'ai-ml-engineer',
    },
    {
      title: 'Senior DevOps / Platform Engineer',
      department: 'Cloud & DevOps',
      skills: ['Kubernetes', 'Terraform', 'AWS / Azure', 'GitHub Actions'],
      location: 'Kolkata, India',
      city: 'Kolkata',
      country: 'India',
      employmentType: 'Full-time',
      applyUrl: 'https://www.brainiuminfotech.com/careers#apply-senior-devops-platform-engineer',
      sourceUrl: 'https://www.brainiuminfotech.com/careers#apply-senior-devops-platform-engineer',
      jobId: 'senior-devops-platform-engineer',
    },
  ])
})

test('Brainium Information Technologies run returns structured jobs from the verified first-party careers page', async () => {
  const brainium = await loadBrainiumModule()
  const requestedUrls = []

  const jobs = await brainium.createBrainiumInformationTechnologiesScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://www.brainiuminfotech.com/careers'])
  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.department, job.city, job.country, job.source, job.scrapedAt]),
    [
      ['Senior Full-Stack Engineer', 'Engineering', 'Kolkata', 'India', 'brainiuminformationtechnologies', FIXED_SCRAPED_AT],
      ['AI / ML Engineer', 'AI & Data', 'Kolkata', 'India', 'brainiuminformationtechnologies', FIXED_SCRAPED_AT],
      ['Senior DevOps / Platform Engineer', 'Cloud & DevOps', 'Kolkata', 'India', 'brainiuminformationtechnologies', FIXED_SCRAPED_AT],
    ],
  )
})

test('Brainium Information Technologies fails closed when the verified careers surface no longer exposes open roles', async () => {
  const brainium = await loadBrainiumModule()

  await assert.rejects(
    brainium.createBrainiumInformationTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified official careers page/i,
  )
})
