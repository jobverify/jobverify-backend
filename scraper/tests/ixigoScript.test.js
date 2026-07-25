import assert from 'node:assert/strict'
import test from 'node:test'

const currentCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>ixigo careers</title>
    <meta name="description" content="ixigo careers" />
  </head>
  <body>
    <p>Join our team of 250+ passionate folks</p>
    <h1>we are changing the way India travels.</h1>
    <section id="openings">
      <div class="self-center text-5xl text-center font-extrabold text-white px-[13%] mb-12">Open roles</div>
      <div class="w-full border-b-2 grid grid-col-1 py-6">
        <div class="text-center place-self-center justify-self-center self-center">No Jobs Found</div>
      </div>
      <div class="justify-center self-center text-greyClr text-center font-extrabold text-2xl mb-4">
        Could not find an open position that excites you ?
      </div>
      <div class="justify-center self-center mb-2">
        <a rel="noreferrer" href="/cdn-cgi/l/email-protection#1231332037372021">Apply for Another Position</a>
      </div>
    </section>
  </body>
</html>
`

const currentCareersWithJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>ixigo careers</title>
  </head>
  <body>
    <p>Join our team of 250+ passionate folks</p>
    <h1>we are changing the way India travels.</h1>
    <section id="openings">
      <div>Open roles</div>
      <article class="job-card">
        <a href="https://www.ixigo.com/about/careers/research-engineer/">Research Engineer</a>
      </article>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../ixigo/script.js')
  } catch {
    assert.fail('Expected ixigo scraper module at ../ixigo/script.js')
  }
}

test('ixigo sentinel pins the verified legacy redirect and current no-jobs careers page URLs', async () => {
  const ixigo = await loadModule()

  assert.equal(ixigo.SOURCE, 'ixigo')
  assert.equal(ixigo.COMPANY, 'ixigo')
  assert.equal(ixigo.HOMEPAGE_URL, 'https://www.ixigo.com/')
  assert.equal(ixigo.LEGACY_CAREERS_URL, 'https://www.ixigo.com/about/careers/')
  assert.equal(ixigo.CURRENT_CAREERS_URL, 'https://careers.ixigo.com/')
  assert.equal(ixigo.hasOfficialCareersSignal(currentCareersHtml), true)
  assert.equal(ixigo.hasVerifiedNoJobsSignal(currentCareersHtml), true)
  assert.equal(ixigo.hasVerifiedNoJobsSignal(currentCareersWithJobsHtml), false)
})

test('ixigo returns no jobs only while the verified official careers surface remains a no-jobs sentinel', async () => {
  const ixigo = await loadModule()
  const requested = []

  const jobs = await ixigo.createIxigoScraper().run({
    fetchPage: async (url) => {
      requested.push(url)

      if (url === ixigo.LEGACY_CAREERS_URL) {
        return {
          status: 200,
          url: ixigo.CURRENT_CAREERS_URL,
          html: currentCareersHtml,
        }
      }

      if (url === ixigo.CURRENT_CAREERS_URL) {
        return {
          status: 200,
          url: ixigo.CURRENT_CAREERS_URL,
          html: currentCareersHtml,
        }
      }

      throw new Error(`Unexpected ixigo fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    ixigo.LEGACY_CAREERS_URL,
    ixigo.CURRENT_CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('ixigo fails closed when the legacy redirect drifts or the current careers page stops being a no-jobs sentinel', async () => {
  const ixigo = await loadModule()

  await assert.rejects(
    ixigo.createIxigoScraper().run({
      fetchPage: async (url) => {
        if (url === ixigo.LEGACY_CAREERS_URL) {
          return {
            status: 200,
            url: 'https://www.ixigo.com/about/careers/',
            html: currentCareersHtml,
          }
        }

        throw new Error(`Unexpected ixigo fixture URL: ${url}`)
      },
    }),
    /legacy careers redirect/i,
  )

  await assert.rejects(
    ixigo.createIxigoScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url: ixigo.CURRENT_CAREERS_URL,
        html: url === ixigo.CURRENT_CAREERS_URL
          ? '<html><body><h1>Careers</h1></body></html>'
          : currentCareersHtml,
      }),
    }),
    /official ixigo careers page/i,
  )

  await assert.rejects(
    ixigo.createIxigoScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: ixigo.CURRENT_CAREERS_URL,
        html: currentCareersWithJobsHtml,
      }),
    }),
    /now exposes public jobs|verified no-jobs surface/i,
  )
})
