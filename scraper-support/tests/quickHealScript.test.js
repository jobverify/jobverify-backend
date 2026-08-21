import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Quick Heal | Cybersecurity Jobs &amp; Career Opportunities</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Work with purpose. Grow from the experience. Innovate to shape the future with Quick Heal</p>
      <p>Innovator. Curious. Growth-mindset. Positive. Sounds like you? Be a part of our Quick Heal family and challenge the status quo - every day!</p>
      <a href="https://lifecycleqhtl.darwinbox.in/ms/candidate/careers" target="_blank">Apply for a job</a>
      <a href="https://lifecycleqhtl.darwinbox.in/ms/candidate/register" target="_blank" rel="nofollow noopener">Join Our Innovative Team</a>
    </main>
  </body>
</html>
`

const careersHtmlWithSiteTitlePrefix = careersHtml.replace(
  '<title>Careers at Quick Heal | Cybersecurity Jobs &amp; Career Opportunities</title>',
  '<title>Cybersecurity, Antivirus &amp; Network Security Software Company Careers at Quick Heal | Cybersecurity Jobs &amp; Career Opportunities</title>',
)

const loadModule = async () => {
  try {
    return await import('../../scraper/quickheal/script.js')
  } catch {
    assert.fail('Expected Quick Heal scraper module at ../../scraper/quickheal/script.js')
  }
}

test('Quick Heal official careers verifier accepts the current first-party page title and Darwinbox handoff', async () => {
  const quickheal = await loadModule()

  assert.equal(quickheal.SOURCE, 'quickheal')
  assert.equal(quickheal.COMPANY_NAME, 'Quick Heal')
  assert.equal(
    quickheal.extractOfficialDarwinboxUrl(careersHtml),
    'https://lifecycleqhtl.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(quickheal.hasOfficialQuickHealCareersSignals(careersHtml), true)
})

test('Quick Heal official careers verifier accepts the current .com page title prefix while preserving the Darwinbox handoff', async () => {
  const quickheal = await loadModule()

  assert.equal(
    quickheal.extractOfficialDarwinboxUrl(careersHtmlWithSiteTitlePrefix),
    'https://lifecycleqhtl.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(quickheal.hasOfficialQuickHealCareersSignals(careersHtmlWithSiteTitlePrefix), true)
})
