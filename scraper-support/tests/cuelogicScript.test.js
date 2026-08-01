import assert from 'node:assert/strict'
import test from 'node:test'

const searchHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>LTIMindtree Careers</title>
  </head>
  <body>
    <h1>Search jobs</h1>
    <div>LTIMindtree</div>
    <div>Results <b>0</b> of <b>0</b></div>
    <p>There are currently no open positions matching "Cuelogic".</p>
  </body>
</html>
`

const currentSearchHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Cuelogic - LTM Jobs</title>
  </head>
  <body>
    <div>LTIMindtree</div>
    <h1>Search results for "Cuelogic".</h1>
    <p>There are currently no open positions matching " Cuelogic ".</p>
    <p>The 0 most recent jobs posted by LTM are listed below for your convenience.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/cuelogic/script.js')
  } catch {
    assert.fail('Expected Cuelogic scraper module at ../../scraper/cuelogic/script.js')
  }
}

test('Cuelogic sentinel pins the verified LTIMindtree search query and empty-state wording', async () => {
  const cuelogic = await loadModule()

  assert.equal(cuelogic.SOURCE, 'cuelogic')
  assert.equal(cuelogic.COMPANY, 'Cuelogic')
  assert.equal(cuelogic.CAREERS_URL, 'https://careers.ltimindtree.com/search/')
  assert.equal(
    cuelogic.buildSearchUrl(),
    'https://careers.ltimindtree.com/search/?createNewAlert=false&q=Cuelogic&optionsFacetsDD_country=&optionsFacetsDD_location=&locationsearch=',
  )
  assert.equal(cuelogic.hasVerifiedEmptySearchSignal(searchHtml), true)
  assert.equal(cuelogic.hasVerifiedEmptySearchSignal(currentSearchHtml), true)
  assert.equal(cuelogic.pageExposesOpenJobs(searchHtml), false)
})

test('Cuelogic sentinel returns no jobs while the verified parent board still shows an empty result set', async () => {
  const cuelogic = await loadModule()
  const requestedUrls = []

  const jobs = await cuelogic.createCuelogicScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return searchHtml
    },
  })

  assert.deepEqual(requestedUrls, [cuelogic.buildSearchUrl()])
  assert.deepEqual(jobs, [])
})

test('Cuelogic sentinel fails closed if the parent board no longer exposes the verified empty-state', async () => {
  const cuelogic = await loadModule()

  await assert.rejects(
    cuelogic.createCuelogicScraper().run({
      fetchText: async () => '<html><body><h1>Search jobs</h1><div>LTIMindtree</div></body></html>',
    }),
    /verified LTIMindtree empty-search surface/i,
  )
})
