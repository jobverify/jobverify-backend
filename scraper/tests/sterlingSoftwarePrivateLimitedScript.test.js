import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedCareersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Career | Sterling | Financial Technology. Digital. Consulting</title>
  </head>
  <body>
    <main>
      <h1>Work at Sterling</h1>
      <h2>Current Opening</h2>
      <p>We have inspiring people and stimulating work environment coupled with competitive compensation and other benefits.</p>
      <a href="/contact#careers">Careers</a>
      <!--
      <table class="job_listing">
        <tr>
          <td>Application Engineer</td>
          <td>2 - 3 Years</td>
          <td><a href="/new/application-engineer">View more</a></td>
          <td style="display:none">Chennai</td>
        </tr>
        <tr>
          <td>Java</td>
          <td>2 - 3 Years</td>
          <td><a href="/new/java-architect">View more</a></td>
          <td style="display:none">Chennai</td>
        </tr>
      </table>
      -->
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../sterlingsoftwareprivatelimited/script.js')
  } catch {
    assert.fail('Expected Sterling Software Private Limited scraper module at ../sterlingsoftwareprivatelimited/script.js')
  }
}

test('Sterling Software Private Limited helpers stay pinned to the verified first-party careers page with only commented historical openings', async () => {
  const sterlingSoftware = await loadModule()

  assert.equal(sterlingSoftware.SOURCE, 'sterlingsoftwareprivatelimited')
  assert.equal(sterlingSoftware.COMPANY, 'Sterling Software Private Limited')
  assert.equal(sterlingSoftware.CAREERS_URL, 'https://sterlingsoftware.global/career/')
  assert.equal(sterlingSoftware.VERIFIED_ON, '2026-07-17')
  assert.equal(sterlingSoftware.hasVerifiedCareersSignal(verifiedCareersHtml), true)
  assert.equal(sterlingSoftware.hasOnlyCommentedHistoricalOpenings(verifiedCareersHtml), true)
})

test('Sterling Software Private Limited returns no jobs while the verified page keeps live openings commented out', async () => {
  const sterlingSoftware = await loadModule()
  const requestedUrls = []

  const jobs = await sterlingSoftware.createSterlingSoftwarePrivateLimitedScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return verifiedCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [sterlingSoftware.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Sterling Software Private Limited fails closed when the verified page drifts or exposes live openings', async () => {
  const sterlingSoftware = await loadModule()

  await assert.rejects(
    sterlingSoftware.createSterlingSoftwarePrivateLimitedScraper().run({
      fetchText: async () => '<html><body>Unexpected</body></html>',
    }),
    /verified Sterling careers page/i,
  )

  await assert.rejects(
    sterlingSoftware.createSterlingSoftwarePrivateLimitedScraper().run({
      fetchText: async () => verifiedCareersHtml.replace('<!--', '').replace('-->', ''),
    }),
    /live public openings/i,
  )
})
