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
      <a href="https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&amp;siteid=5008#home">
        Explore Current Openings
      </a>
      <section>
        <p>Our team will reach out to you when we have the opening.</p>
        <a href="https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&amp;siteid=5008#home">
          Submit Your Resume
        </a>
      </section>
    </main>
  </body>
</html>
`

const emptyIndiaBrassringHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>India - Job Search</title>
  </head>
  <body>
    <main>
      <h1>Search Jobs at Infinite Computer Solutions</h1>
      <p>Search job opportunities that match your interests</p>
      <p>Search location</p>
      <p>There are no jobs that match your criteria</p>
      <a href="/privacy">Infinite Talent Privacy Statement</a>
    </main>
  </body>
</html>
`

test('Infinite Computer Solutions validates the official careers page and current empty India BrassRing search', async () => {
  const infinite = await loadInfiniteComputerSolutionsModule()

  assert.equal(infinite.SOURCE, 'infinitecomputersolutions')
  assert.equal(infinite.COMPANY, 'Infinite Computer Solutions')
  assert.equal(infinite.CAREERS_URL, 'https://www.infinite.com/careers')
  assert.equal(
    infinite.BRASSRING_URL,
    'https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&siteid=5008',
  )
  assert.equal(
    infinite.INDIA_BRASSRING_SEARCH_URL,
    'https://sjobs.brassring.com/TGNewUI/Search/Home/Home?partnerid=26656&siteid=5008#keyWordSearch=&locationSearch=India',
  )
  assert.equal(infinite.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(infinite.extractBrassringUrl(officialCareersHtml), infinite.BRASSRING_URL)
  assert.equal(infinite.hasIndiaSearchEmptySignal(emptyIndiaBrassringHtml), true)
})

test('Infinite Computer Solutions returns no jobs while the official India BrassRing search is empty', async () => {
  const infinite = await loadInfiniteComputerSolutionsModule()
  const requestedUrls = []
  const requestedBrowserUrls = []

  const jobs = await infinite.createInfiniteComputerSolutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === infinite.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchBrowserText: async (url) => {
      requestedBrowserUrls.push(url)
      if (url === infinite.INDIA_BRASSRING_SEARCH_URL) return emptyIndiaBrassringHtml
      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [infinite.CAREERS_URL])
  assert.deepEqual(requestedBrowserUrls, [infinite.INDIA_BRASSRING_SEARCH_URL])
  assert.deepEqual(jobs, [])
})

test('Infinite Computer Solutions falls back to a browser-backed page loader when Node fetch times out', async () => {
  const infinite = await loadInfiniteComputerSolutionsModule()
  const requestedPrimaryUrls = []
  const requestedBrowserUrls = []

  const jobs = await infinite.createInfiniteComputerSolutionsScraper().run({
    fetchText: async (url) => {
      requestedPrimaryUrls.push(url)
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fetchBrowserText: async (url) => {
      requestedBrowserUrls.push(url)
      if (url === infinite.CAREERS_URL) return officialCareersHtml
      if (url === infinite.INDIA_BRASSRING_SEARCH_URL) return emptyIndiaBrassringHtml
      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPrimaryUrls, [infinite.CAREERS_URL])
  assert.deepEqual(requestedBrowserUrls, [
    infinite.CAREERS_URL,
    infinite.INDIA_BRASSRING_SEARCH_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Infinite Computer Solutions fails closed when the official careers flow changes or the India BrassRing search starts exposing usable listings', async () => {
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
        throw new Error(`Unexpected URL: ${url}`)
      },
      fetchBrowserText: async (url) => {
        if (url === infinite.INDIA_BRASSRING_SEARCH_URL) {
          return `
            <main>
              <h1>Search Jobs at Infinite Computer Solutions</h1>
              <a href="/TGnewUI/Search/home/HomeWithPreLoad?partnerid=26656&amp;siteid=5008&amp;PageType=JobDetails&amp;jobid=123456">
                Senior Software Engineer
              </a>
            </main>
          `
        }

        throw new Error(`Unexpected browser URL: ${url}`)
      },
    }),
    /india brassring search now exposes usable listings or changed shape/i,
  )
})
