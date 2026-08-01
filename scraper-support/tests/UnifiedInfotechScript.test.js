import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/unifiedinfotech/script.js')
  } catch {
    assert.fail('Expected Unified Infotech scraper module at ../../scraper/unifiedinfotech/script.js')
  }
}

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Maximize Your Career &amp; Job Opportunities</title>
  </head>
  <body>
    <h1>Innovate and Succeed with Team Unified!</h1>
    <section class="openings">
      <article class="job-card">
        <h2>Senior React Developer</h2>
        <p>Remote/Hybrid</p>
        <p>Full Time</p>
        <p>Kolkata / Pan India</p>
        <a href="/careers/senior-react-developer">read more</a>
      </article>
      <article class="job-card">
        <h2>Lead DevOps Engineer</h2>
        <p>Remote</p>
        <p>Full Time</p>
        <p>Kolkata</p>
        <a href="/careers/lead-devops-engineer">read more</a>
      </article>
    </section>
    <button>Load More</button>
    <section>
      <h2>Apply For A Position</h2>
      <form action="/careers/apply">
        <input type="file" name="resume" />
      </form>
    </section>
  </body>
</html>
`

test('Unified Infotech validates the verified first-party careers page and extracts public opening cards', async () => {
  const unified = await loadModule()

  assert.equal(unified.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(unified.extractJobCards(careersHtml), [
    {
      title: 'Senior React Developer',
      location: 'Kolkata / Pan India',
      remoteType: 'Remote/Hybrid',
      employmentType: 'Full Time',
      sourceUrl: 'https://www.unifiedinfotech.net/careers/senior-react-developer',
      applyUrl: 'https://www.unifiedinfotech.net/careers/senior-react-developer',
    },
    {
      title: 'Lead DevOps Engineer',
      location: 'Kolkata',
      remoteType: 'Remote',
      employmentType: 'Full Time',
      sourceUrl: 'https://www.unifiedinfotech.net/careers/lead-devops-engineer',
      applyUrl: 'https://www.unifiedinfotech.net/careers/lead-devops-engineer',
    },
  ])
})

test('Unified Infotech run returns normalized jobs from the verified careers page', async () => {
  const unified = await loadModule()
  const jobs = await unified.run({
    fetchText: async (url) => {
      assert.equal(url, unified.CAREERS_URL)
      return careersHtml
    },
    now: () => '2026-07-17T00:00:00.000Z',
  })

  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      remoteType: job.remoteType,
      link: job.link,
      source: job.source,
    })),
    [
      {
        title: 'Senior React Developer',
        location: 'Kolkata / Pan India',
        remoteType: 'Remote/Hybrid',
        link: 'https://www.unifiedinfotech.net/careers/senior-react-developer',
        source: 'unifiedinfotech',
      },
      {
        title: 'Lead DevOps Engineer',
        location: 'Kolkata',
        remoteType: 'Remote',
        link: 'https://www.unifiedinfotech.net/careers/lead-devops-engineer',
        source: 'unifiedinfotech',
      },
    ],
  )
})

test('Unified Infotech default fetch is bounded by a timeout signal', async () => {
  const unified = await loadModule()
  let capturedInit = null

  const html = await unified.defaultFetchText(unified.CAREERS_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init

      return {
        ok: true,
        status: 200,
        text: async () => careersHtml,
      }
    },
  })

  assert.equal(html, careersHtml)
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
  assert.equal(capturedInit.headers.Accept.includes('text/html'), true)
})

test('Unified Infotech fails closed when the verified careers page loses the openings surface', async () => {
  const unified = await loadModule()

  await assert.rejects(
    unified.run({
      fetchText: async () => '<html><body><h1>Apply For A Position</h1></body></html>',
    }),
    /verified first-party careers page/i,
  )
})
