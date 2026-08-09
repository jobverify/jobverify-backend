import assert from 'node:assert/strict'
import test from 'node:test'

const loadSkyscannerModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const verifiedShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current jobs | Skyscanner Careers</title>
  </head>
  <body>
    <main>
      <h1>Current jobs</h1>
      <button>All teams</button>
      <button>All locations</button>
      <label>Search by title, team or location</label>
    </main>
  </body>
</html>
`

const challengeGateHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Skyscanner</title>
    <script defer="defer" src="./static/js/main.c7ae3cbc.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <main>
      <h1>Are you a person or a robot?</h1>
      <p>Please don't take this personally - some scripts and bots are remarkably lifelike these days!</p>
      <p>Still having problems accessing the page? Try checking you have JavaScript and cookies turned on and that your browser isn't blocking them from loading.</p>
    </main>
  </body>
</html>
`

const challengeShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <meta name="theme-color" content="#000000">
    <link rel="manifest" href="./manifest.json">
    <link rel="shortcut icon" href="./favicon.ico">
    <title>Skyscanner</title>
    <link rel="icon" href="/favicon.ico">
    <script type="text/javascript">window.__pageLoadedTime=Date.now()</script>
    <script defer="defer" src="./static/js/main.c7ae3cbc.js"></script>
    <link href="./static/css/main.a345165e.css" rel="stylesheet">
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`

const enumerableJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current jobs | Skyscanner Careers</title>
  </head>
  <body>
    <main>
      <h1>Current jobs</h1>
      <a href="/jobs/job/12345">Senior Software Engineer</a>
      <script>
        window.__jobs = [{ jobId: '12345', jobTitle: 'Senior Software Engineer', jobLocation: 'Bangalore, India' }]
      </script>
    </main>
  </body>
</html>
`

test('Skyscanner recognizes both the verified jobs shell and the current first-party challenge gate', async () => {
  const skyscanner = await loadSkyscannerModule()

  assert.ok(skyscanner, 'Expected Skyscanner scraper module at ./script.js')
  assert.equal(skyscanner.SOURCE, 'skyscanner')
  assert.equal(skyscanner.COMPANY, 'Skyscanner')
  assert.equal(skyscanner.CAREERS_URL, 'https://www.skyscanner.com/jobs/current-jobs')
  assert.equal(skyscanner.hasVerifiedJobsShellSignal(verifiedShellHtml), true)
  assert.equal(skyscanner.hasEnumerableJobsSignal(verifiedShellHtml), false)
  assert.equal(skyscanner.hasChallengeGateSignal(challengeGateHtml), true)
  assert.equal(skyscanner.hasEnumerableJobsSignal(challengeGateHtml), false)
  assert.equal(skyscanner.hasChallengeGateSignal(challengeShellHtml), true)
  assert.equal(skyscanner.hasEnumerableJobsSignal(challengeShellHtml), false)
})

test('Skyscanner returns an empty list while the official page is either the verified shell or the current challenge gate', async () => {
  const skyscanner = await loadSkyscannerModule()
  assert.ok(skyscanner, 'Expected Skyscanner scraper module at ./script.js')

  const shellJobs = await skyscanner.createSkyscannerScraper().run({
    fetchText: async () => verifiedShellHtml,
  })
  assert.deepEqual(shellJobs, [])

  const challengeJobs = await skyscanner.createSkyscannerScraper().run({
    fetchText: async () => challengeGateHtml,
  })
  assert.deepEqual(challengeJobs, [])

  const challengeShellJobs = await skyscanner.createSkyscannerScraper().run({
    fetchText: async () => challengeShellHtml,
  })
  assert.deepEqual(challengeShellJobs, [])
})

test('Skyscanner still fails closed when the surface turns enumerable or drifts beyond the verified challenge-aware contract', async () => {
  const skyscanner = await loadSkyscannerModule()
  assert.ok(skyscanner, 'Expected Skyscanner scraper module at ./script.js')

  await assert.rejects(
    skyscanner.createSkyscannerScraper().run({
      fetchText: async () => enumerableJobsHtml,
    }),
    /enumerable public jobs/i,
  )

  await assert.rejects(
    skyscanner.createSkyscannerScraper().run({
      fetchText: async () => '<html><head><title>Skyscanner</title></head><body><main><h1>Careers</h1></main></body></html>',
    }),
    /trusted filter shell/i,
  )
})
