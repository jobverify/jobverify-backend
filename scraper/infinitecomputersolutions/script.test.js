import assert from 'node:assert/strict'
import test from 'node:test'

const loadInfiniteComputerSolutionsModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Infinite Computer Solutions scraper module at ./script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Infinite | Explore Job Opportunities &amp; Build Your Future</title>
  </head>
  <body>
    <main>
      <h1>Welcome to Careers at Infinite</h1>
      <p>The work we do impacts the world, and the future!</p>
      <a href="https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&amp;siteid=5008">
        Explore Current Openings
      </a>
      <section>
        <h2>Can't find your job? Don't worry!</h2>
        <p>Our team will reach out to you when we have the opening.</p>
        <a href="https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&amp;siteid=5008">
          Submit Your Resume
        </a>
      </section>
    </main>
  </body>
</html>
`

const invalidBrassringHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Search Jobs at | Infinite Computer Solutions</h1>
      <p>We're sorry, this link is no longer valid.</p>
      <p>Your session has expired due to inactivity.</p>
      <p>There are no jobs that match your criteria</p>
      <p>
        The job posting you are looking for has expired or the position has already been filled.
        If you are interested in one of our other opportunities, please visit our career site.
      </p>
    </main>
  </body>
</html>
`

test('Infinite Computer Solutions validates the official careers page and current invalid public BrassRing handoff', async () => {
  const infinite = await loadInfiniteComputerSolutionsModule()

  assert.equal(infinite.SOURCE, 'infinitecomputersolutions')
  assert.equal(infinite.COMPANY, 'Infinite Computer Solutions')
  assert.equal(infinite.CAREERS_URL, 'https://www.infinite.com/careers')
  assert.equal(
    infinite.BRASSRING_URL,
    'https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&siteid=5008',
  )
  assert.equal(infinite.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(infinite.extractBrassringUrl(officialCareersHtml), infinite.BRASSRING_URL)
  assert.equal(infinite.hasInvalidBrassringSignal(invalidBrassringHtml), true)
})

test('Infinite Computer Solutions returns no jobs while the official public flow is a resume handoff plus an invalid BrassRing page', async () => {
  const infinite = await loadInfiniteComputerSolutionsModule()
  const requestedUrls = []

  const jobs = await infinite.createInfiniteComputerSolutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === infinite.CAREERS_URL) return officialCareersHtml
      if (url === infinite.BRASSRING_URL) return invalidBrassringHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    infinite.CAREERS_URL,
    infinite.BRASSRING_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Infinite Computer Solutions fails closed when the official careers flow changes or the BrassRing page starts exposing usable listings', async () => {
  const infinite = await loadInfiniteComputerSolutionsModule()

  await assert.rejects(
    infinite.createInfiniteComputerSolutionsScraper().run({
      fetchText: async () => '<main><h1>Infinite Careers</h1></main>',
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    infinite.createInfiniteComputerSolutionsScraper().run({
      fetchText: async (url) => {
        if (url === infinite.CAREERS_URL) return officialCareersHtml
        if (url === infinite.BRASSRING_URL) {
          return `
            <main>
              <h1>Search Jobs at | Infinite Computer Solutions</h1>
              <a href="/TGnewUI/Search/home/HomeWithPreLoad?partnerid=26656&amp;siteid=5008&amp;PageType=JobDetails&amp;jobid=123456">
                Senior Software Engineer
              </a>
            </main>
          `
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /public brassring surface now appears usable or changed shape/i,
  )
})
