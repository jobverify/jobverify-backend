import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Discover Jobs - BEO Softwares</title>
  </head>
  <body>
    <main>
      <h1>Discover Jobs</h1>
      <article class="job-card">
        <a href="/careers-jobs-detail/senior-web-developer-wordpress-php-html-css">
          <h2>Senior Web Developer (WordPress, PHP, HTML, CSS)</h2>
        </a>
        <p>Location : Kochi</p>
        <p>Posted on 24-03-2026</p>
      </article>
      <article class="job-card">
        <a href="/careers-jobs-detail/technical-lead-fullstack">
          <h2>Technical Lead ( Fullstack)</h2>
        </a>
        <p>Location : Kochi</p>
        <p>Posted on 15-01-2026</p>
      </article>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/beosoftware/script.js')
  } catch {
    assert.fail('Expected BEO Software scraper module at ../../scraper/beosoftware/script.js')
  }
}

test('BEO Software extracts public job cards from the verified first-party careers page', async () => {
  const beo = await loadModule()

  assert.equal(beo.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(beo.extractJobCards(careersHtml), [
    {
      title: 'Senior Web Developer (WordPress, PHP, HTML, CSS)',
      location: 'Kochi, India',
      city: 'Kochi',
      postingDate: '2026-03-24',
      detailUrl: 'https://beo-software.in/careers-jobs-detail/senior-web-developer-wordpress-php-html-css',
    },
    {
      title: 'Technical Lead ( Fullstack)',
      location: 'Kochi, India',
      city: 'Kochi',
      postingDate: '2026-01-15',
      detailUrl: 'https://beo-software.in/careers-jobs-detail/technical-lead-fullstack',
    },
  ])

  const jobs = await beo.createBeoSoftwareScraper().run({
    fetchText: async () => careersHtml,
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.postingDate, job.applyUrl]),
    [
      [
        'Senior Web Developer (WordPress, PHP, HTML, CSS)',
        'Kochi, India',
        '2026-03-24',
        'https://beo-software.in/careers-jobs-detail/senior-web-developer-wordpress-php-html-css',
      ],
      [
        'Technical Lead ( Fullstack)',
        'Kochi, India',
        '2026-01-15',
        'https://beo-software.in/careers-jobs-detail/technical-lead-fullstack',
      ],
    ],
  )
})
