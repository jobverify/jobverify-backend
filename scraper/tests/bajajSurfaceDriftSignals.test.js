import assert from 'node:assert/strict'
import test from 'node:test'

const bajajAutoHomepageHtml = `
<!doctype html>
<html>
  <head>
    <title>Bajaj Auto - Bikes, Scooters, Three Wheelers &amp; Qute (2026)</title>
  </head>
  <body>
    <a href="/careers">Careers</a>
  </body>
</html>
`

const bajajAutoCareersHubHtml = `
<!doctype html>
<html>
  <head>
    <title>Why Work With Bajaj Auto &ndash; Careers &amp; Opportunities</title>
  </head>
  <body>
    <p>Select your preferences to find a job</p>
    <a href="/careers/search-result">Search jobs</a>
  </body>
</html>
`

const bajajElectricalsCareersHtml = `
<!doctype html>
<html>
  <head>
    <title>Careers &ndash; Bajaj Electricals India</title>
    <link rel="canonical" href="https://www.bajajelectricals.com/pages/careers">
  </head>
  <body>
    <h1>Careers</h1>
    <a href="https://bel.darwinbox.com/ms/candidatev2/main/careers/allJobs">Browse jobs</a>
  </body>
</html>
`

const bajajHousingFinanceHomepageHtml = `
<!doctype html>
<html>
  <head>
    <title>Bajaj Housing Finance - Leading Non-Banking Financial Company in India</title>
  </head>
  <body>
    <h1>Bajaj Housing Finance</h1>
    <p>We offer home loan, housing finance, and mortgage solutions across India.</p>
  </body>
</html>
`

test('Bajaj validator signals accept the current public title and canonical variants from Saturday, July 25, 2026', async () => {
  const bajajAuto = await import('../bajajauto/script.js')
  const bajajElectricals = await import('../bajajelectricals/script.js')
  const bajajHousingFinance = await import('../bajajhousingfinance/script.js')

  assert.equal(bajajAuto.hasOfficialHomepageSignal(bajajAutoHomepageHtml), true)
  assert.equal(bajajAuto.hasOfficialCareersHubSignal(bajajAutoCareersHubHtml), true)
  assert.equal(
    bajajElectricals.hasOfficialBajajElectricalsCareersSignals(bajajElectricalsCareersHtml),
    true,
  )
  assert.equal(bajajHousingFinance.isVerifiedHomepage(bajajHousingFinanceHomepageHtml), true)
})
