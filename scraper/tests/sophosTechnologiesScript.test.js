import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../sophostechnologies/script.js')
  } catch {
    assert.fail('Expected Sophos Technologies scraper module at ../sophostechnologies/script.js')
  }
}

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Explore Career Opportunities at Sophos</title>
  </head>
  <body>
    <main>
      <h1>Join the Sophos team</h1>
      <p>Flexible work. Meaningful impact. Build the future of cybersecurity.</p>
      <a href="/en-us/company/careers/jobs">Explore our job listings</a>
      <p>Sophos India teams collaborate across engineering and support.</p>
    </main>
  </body>
</html>
`

test('Sophos Technologies sentinel pins the verified first-party careers landing page', async () => {
  const sophos = await loadModule()

  assert.equal(sophos.SOURCE, 'sophostechnologies')
  assert.equal(sophos.COMPANY, 'Sophos Technologies')
  assert.equal(sophos.OFFICIAL_BRAND_NAME, 'Sophos')
  assert.equal(sophos.CAREERS_URL, 'https://www.sophos.com/en-us/company/careers')
  assert.equal(sophos.VERIFIED_ON, '2026-07-17')
  assert.equal(sophos.hasVerifiedCareersSignal(careersHtml), true)
})

test('Sophos Technologies returns [] while the verified careers landing exposes only a handoff CTA and no inline jobs', async () => {
  const sophos = await loadModule()

  const jobs = await sophos.createSophosTechnologiesScraper().run({
    fetchText: async (url) => {
      assert.equal(url, sophos.CAREERS_URL)
      return careersHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('Sophos Technologies fails closed when the verified careers landing drifts', async () => {
  const sophos = await loadModule()

  await assert.rejects(
    sophos.createSophosTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Open Roles</h1></body></html>',
    }),
    /verified Sophos careers landing/i,
  )
})
