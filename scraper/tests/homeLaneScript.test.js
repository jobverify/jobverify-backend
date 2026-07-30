import assert from 'node:assert/strict'
import test from 'node:test'

const JOBS_HTML = `
<!DOCTYPE html>
<html lang="en">
  <body>
    <p>15 roles currently open.</p>
    <div class="space-y-10">
      <div>
        <h2>Interior Design</h2>
        <a class="block group" href="/jobs/HL_20">
          <article>
            <h3>Design Consultant</h3>
            <span>Bengaluru<!-- -->, <!-- -->Karnataka</span>
            <span>2<!-- -->–<!-- -->6<!-- --> years exp</span>
            <span>1<!-- --> opening</span>
            <p>.</p>
            <div>₹3.0L – ₹6.0L p.a.</div>
            <span>Actively hiring</span>
          </article>
        </a>
        <a class="block group" href="/jobs/HL_21">
          <article>
            <h3>Design Associate</h3>
            <span>Chennai<!-- -->, <!-- -->Tamil Nadu</span>
            <span>0<!-- -->–<!-- -->1<!-- --> years exp</span>
            <span>1<!-- --> opening</span>
            <p>About Homelane HomeLane is built for designers who want more.</p>
            <div>₹3.0L – ₹3.5L p.a.</div>
            <span>Actively hiring</span>
          </article>
        </a>
      </div>
    </div>
  </body>
</html>
`

const DETAIL_HTML = `
<!DOCTYPE html>
<html lang="en">
  <body>
    <h1>Design Consultant</h1>
    <span>Bengaluru<!-- -->, <!-- -->Karnataka</span>
    <span>2<!-- -->–<!-- -->6<!-- --> years</span>
    <div>₹3.0L – ₹6.0L p.a.</div>
    <a href="/apply/HL_20">Apply Now</a>
    <section>
      <h2>About the Role</h2>
      <p>Own the customer design journey from concept to final sign-off.</p>
    </section>
  </body>
</html>
`

const loadHomeLaneModule = async () => {
  try {
    return await import('../homelane/script.js')
  } catch {
    assert.fail('Expected HomeLane scraper module at ../homelane/script.js')
  }
}

test('HomeLane helpers stay pinned to the verified first-party Sentinel jobs index and detail routes', async () => {
  const homelane = await loadHomeLaneModule()

  assert.equal(homelane.SOURCE, 'homelane')
  assert.equal(homelane.COMPANY, 'HomeLane')
  assert.equal(homelane.VERIFIED_ON, '2026-07-25')
  assert.equal(homelane.JOBS_URL, 'https://sentinel.homelane.com/jobs')
  assert.equal(homelane.ROOT_URL, 'https://sentinel.homelane.com/')
  assert.equal(homelane.hasTrustedJobsIndexSignal(JOBS_HTML), true)
  assert.equal(homelane.extractRoleCount(JOBS_HTML), 15)

  assert.deepEqual(homelane.extractJobCards(JOBS_HTML), [
    {
      title: 'Design Consultant',
      detailPath: '/jobs/HL_20',
      detailUrl: 'https://sentinel.homelane.com/jobs/HL_20',
      location: 'Bengaluru, Karnataka',
      city: 'Bengaluru',
      state: 'Karnataka',
      experienceRequired: '2-6 years',
      openingsText: '1 opening',
      salary: '₹3.0L - ₹6.0L p.a.',
      summary: null,
    },
    {
      title: 'Design Associate',
      detailPath: '/jobs/HL_21',
      detailUrl: 'https://sentinel.homelane.com/jobs/HL_21',
      location: 'Chennai, Tamil Nadu',
      city: 'Chennai',
      state: 'Tamil Nadu',
      experienceRequired: '0-1 years',
      openingsText: '1 opening',
      salary: '₹3.0L - ₹3.5L p.a.',
      summary: 'About Homelane HomeLane is built for designers who want more.',
    },
  ])

  assert.deepEqual(
    homelane.extractDetailFields(DETAIL_HTML, 'https://sentinel.homelane.com/jobs/HL_20'),
    {
      applyUrl: 'https://sentinel.homelane.com/apply/HL_20',
      description: 'Own the customer design journey from concept to final sign-off.',
      salary: '₹3.0L - ₹6.0L p.a.',
      location: 'Bengaluru, Karnataka',
      experienceRequired: '2-6 years',
    },
  )
})

test('run fetches the HomeLane jobs index and detail pages, then decorates shared runner fields', async () => {
  const homelane = await loadHomeLaneModule()
  const requested = []

  const jobs = await homelane.createHomeLaneScraper().run({
    fetchText: async (url) => {
      requested.push(url)
      if (url === homelane.JOBS_URL) return JOBS_HTML
      if (url === 'https://sentinel.homelane.com/jobs/HL_20') return DETAIL_HTML
      if (url === 'https://sentinel.homelane.com/jobs/HL_21') {
        return DETAIL_HTML
          .replaceAll('Design Consultant', 'Design Associate')
          .replaceAll('/apply/HL_20', '/apply/HL_21')
          .replaceAll('Bengaluru<!-- -->, <!-- -->Karnataka', 'Chennai<!-- -->, <!-- -->Tamil Nadu')
          .replaceAll('2<!-- -->–<!-- -->6<!-- --> years', '0<!-- -->–<!-- -->1<!-- --> years')
          .replaceAll('₹3.0L – ₹6.0L p.a.', '₹3.0L – ₹3.5L p.a.')
          .replaceAll(
            'Own the customer design journey from concept to final sign-off.',
            'Support senior designers with customer proposals and execution follow-through.',
          )
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    homelane.JOBS_URL,
    'https://sentinel.homelane.com/jobs/HL_20',
    'https://sentinel.homelane.com/jobs/HL_21',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      state: job.state,
      experienceRequired: job.experienceRequired,
      salary: job.salary,
      openingsText: job.openingsText,
      company: job.company,
      source: job.source,
      link: job.link,
      applyUrl: job.applyUrl,
      atsPlatform: job.atsPlatform,
    })),
    [
      {
        title: 'Design Consultant',
        location: 'Bengaluru, Karnataka',
        city: 'Bengaluru',
        state: 'Karnataka',
        experienceRequired: '2-6 years',
        salary: '₹3.0L - ₹6.0L p.a.',
        openingsText: '1 opening',
        company: 'HomeLane',
        source: 'homelane',
        link: 'https://sentinel.homelane.com/jobs/HL_20',
        applyUrl: 'https://sentinel.homelane.com/apply/HL_20',
        atsPlatform: 'first-party-nextjs-jobs-index',
      },
      {
        title: 'Design Associate',
        location: 'Chennai, Tamil Nadu',
        city: 'Chennai',
        state: 'Tamil Nadu',
        experienceRequired: '0-1 years',
        salary: '₹3.0L - ₹3.5L p.a.',
        openingsText: '1 opening',
        company: 'HomeLane',
        source: 'homelane',
        link: 'https://sentinel.homelane.com/jobs/HL_21',
        applyUrl: 'https://sentinel.homelane.com/apply/HL_21',
        atsPlatform: 'first-party-nextjs-jobs-index',
      },
    ],
  )
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
  assert.match(jobs[0].jobDescription, /Own the customer design journey/i)
})
