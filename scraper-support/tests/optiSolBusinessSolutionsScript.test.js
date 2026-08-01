import assert from 'node:assert/strict'
import test from 'node:test'

const careersLandingHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>MORE THAN JUST A JOB</h1>
    <h2>Jobs at OptiSol</h2>
    <a href="https://www.optisolbusiness.com/current-openings">Learn More</a>
  </body>
</html>
`

const archivePageOneHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Full Time</h1>
    <article>
      <a href="https://www.optisolbusiness.com/jobs/solution-architect-digital-services">
        Solution Architect – Digital Services
      </a>
    </article>
    <article>
      <a href="https://www.optisolbusiness.com/jobs/java-developer">
        Java Developer (Spring Boot / Kafka / Integration Specialist)
      </a>
    </article>
    <a class="page-numbers" href="https://www.optisolbusiness.com/job-type/full-time/page/2/">2</a>
  </body>
</html>
`

const archivePageTwoHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Full Time</h1>
    <article>
      <a href="https://www.optisolbusiness.com/jobs/pl-sql-developer">
        PL/SQL Developer
      </a>
    </article>
  </body>
</html>
`

const solutionArchitectHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Solution Architect – Digital Services</h1>
    <p>Full Time</p>
    <p>Chennai, Hybrid</p>
    <p>Experience: 8+ years</p>
    <section class="job-description">
      <p>Lead enterprise-grade digital transformation projects and cloud-native solution design.</p>
    </section>
  </body>
</html>
`

const javaDeveloperHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Java Developer (Spring Boot / Kafka / Integration Specialist)</h1>
    <p>Full Time</p>
    <p>Chennai</p>
    <p>Experience: 1 to 3 years</p>
    <section class="job-description">
      <p>Build scalable backend services and integrations with Spring Boot and Kafka.</p>
    </section>
  </body>
</html>
`

const plSqlDeveloperHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>PL/SQL Developer</h1>
    <p>Full Time</p>
    <p>Madurai</p>
    <p>Experience: 2-5 Years</p>
    <section class="job-description">
      <p>Design and optimize PL/SQL procedures, functions, packages, and triggers.</p>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/optisolbusinesssolutions/script.js')
  } catch {
    assert.fail('Expected OptiSol Business Solutions scraper module at ../../scraper/optisolbusinesssolutions/script.js')
  }
}

test('OptiSol Business Solutions validates the first-party careers landing and archive pages', async () => {
  const optisol = await loadModule()

  assert.equal(optisol.CAREERS_LANDING_URL, 'https://www.optisolbusiness.com/join-with-us')
  assert.equal(optisol.JOBS_ARCHIVE_URL, 'https://www.optisolbusiness.com/job-type/full-time')
  assert.equal(optisol.hasOfficialCareersLandingSignal(careersLandingHtml), true)
  assert.equal(optisol.hasVerifiedJobArchiveSignal(archivePageOneHtml), true)
  assert.deepEqual(
    optisol.extractArchiveJobLinks(archivePageOneHtml),
    [
      'https://www.optisolbusiness.com/jobs/solution-architect-digital-services',
      'https://www.optisolbusiness.com/jobs/java-developer',
    ],
  )
})

test('OptiSol Business Solutions run follows the archive pages and extracts same-domain job details', async () => {
  const optisol = await loadModule()
  const requestedUrls = []

  const jobs = await optisol.createOptiSolBusinessSolutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === optisol.CAREERS_LANDING_URL) return careersLandingHtml
      if (url === optisol.JOBS_ARCHIVE_URL) return archivePageOneHtml
      if (url === 'https://www.optisolbusiness.com/job-type/full-time/page/2/') return archivePageTwoHtml
      if (url === 'https://www.optisolbusiness.com/jobs/solution-architect-digital-services') {
        return solutionArchitectHtml
      }
      if (url === 'https://www.optisolbusiness.com/jobs/java-developer') return javaDeveloperHtml
      if (url === 'https://www.optisolbusiness.com/jobs/pl-sql-developer') return plSqlDeveloperHtml
      throw new Error(`Unexpected OptiSol URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    optisol.CAREERS_LANDING_URL,
    optisol.JOBS_ARCHIVE_URL,
    'https://www.optisolbusiness.com/job-type/full-time/page/2/',
    'https://www.optisolbusiness.com/jobs/solution-architect-digital-services',
    'https://www.optisolbusiness.com/jobs/java-developer',
    'https://www.optisolbusiness.com/jobs/pl-sql-developer',
  ])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.experienceRequired, job.source]),
    [
      ['Solution Architect – Digital Services', 'Chennai, India', '8+ years', 'optisolbusinesssolutions'],
      ['Java Developer (Spring Boot / Kafka / Integration Specialist)', 'Chennai, India', '1-3 years', 'optisolbusinesssolutions'],
      ['PL/SQL Developer', 'Madurai, India', '2-5 years', 'optisolbusinesssolutions'],
    ],
  )
})

test('OptiSol Business Solutions fails closed when the verified archive contract drifts', async () => {
  const optisol = await loadModule()

  await assert.rejects(
    optisol.createOptiSolBusinessSolutionsScraper().run({
      fetchText: async (url) => {
        if (url === optisol.CAREERS_LANDING_URL) return careersLandingHtml
        return archivePageOneHtml.replace('Full Time', 'Archive elsewhere')
      },
    }),
    /verified jobs archive/i,
  )
})
