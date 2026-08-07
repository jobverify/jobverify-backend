import assert from 'node:assert/strict'
import test from 'node:test'

const loadZopperModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Zopper scraper module at ./script.js')
  }
}

const aiPoweredLinkedInSearchHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <p>LinkedIn</p>
      <p>Jobs in India</p>
      <p>Zopper</p>
      <p>You're now using AI-powered job search</p>
      <div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:4431599124">
        <a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/claims-manager-at-zopper-4431599124?position=1&amp;pageNum=0">
          <h3 class="base-search-card__title">Claims Manager</h3>
        </a>
        <h4 class="base-search-card__subtitle"><a>Zopper</a></h4>
        <span class="job-search-card__location">Noida, Uttar Pradesh, India</span>
        <time class="job-search-card__listdate" datetime="2026-07-23"></time>
      </div>
    </main>
  </body>
</html>
`

test('Zopper accepts LinkedIn\'s current AI-powered India search shell', async () => {
  const zopper = await loadZopperModule()
  const listings = zopper.extractSearchResults(aiPoweredLinkedInSearchHtml)

  assert.equal(zopper.hasVerifiedLinkedInJobsPageSignal(aiPoweredLinkedInSearchHtml), true)
  assert.equal(listings.length, 1)
  assert.equal(listings[0].title, 'Claims Manager')
  assert.equal(listings[0].city, 'Noida')
  assert.equal(listings[0].country, 'India')
})
