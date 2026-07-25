import assert from 'node:assert/strict'
import test from 'node:test'

const loadIdfcFirstBankModule = async () => {
  try {
    return await import('../idfcfirstbank/script.js')
  } catch {
    assert.fail('Expected IDFC FIRST Bank scraper module at ../idfcfirstbank/script.js')
  }
}

const careersHomeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join IDFC FIRST Bank and Build a World-Class Bank</title>
  </head>
  <body>
    <main>
      <h1>Build a world-class Bank with us!</h1>
      <p>Focused on Ethical, Digital, and Social Good Banking</p>
      <section>
        <h2>Our Banking Verticals</h2>
        <a href="/in/en/retail-banking">Retail Banking Explore more 0 jobs</a>
        <a href="/in/en/private-banking">Private Banking Explore More 0 jobs</a>
        <a href="/in/en/corporate-banking">Corporate Banking Explore More 0 jobs</a>
      </section>
      <section>
        <h2>Explore Jobs by Experience</h2>
        <a href="/in/en/fresher/entry-level-page">Freshers (0-2 years)</a>
        <a href="/in/en/young-banking-professionals-2--5-years-">Young Professionals (2-5 years)</a>
        <a href="/in/en/mid-level-5--10-years-">Mid Management (5-10 years)</a>
        <a href="/in/en/senior-management-10--18-years-">Senior Management (10-18 years)</a>
      </section>
      <a href="/in/en/jointalentcommunity">Join us</a>
    </main>
  </body>
</html>
`

const retailBankingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join Retail Banking at IDFC FIRST Bank</title>
  </head>
  <body>
    <main>
      <h1>Explore jobs in Retail Banking</h1>
      <p>Join the Retail Banking vertical at IDFC FIRST Bank.</p>
      <a href="/in/en/jointalentcommunity">Join us</a>
    </main>
  </body>
</html>
`

const talentCommunityHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>IDFC FIRST Bank: Join Our Talent Community and Change the World</title>
  </head>
  <body>
    <main>
      <h2>Join our Talent Community Now!</h2>
      <p>Drop your resume to get frequent updates on various job openings.</p>
    </main>
  </body>
</html>
`

test('IDFC FIRST Bank verifies the official careers microsite and returns no jobs when the public surface is a talent community only', async () => {
  const idfcFirstBank = await loadIdfcFirstBankModule()

  assert.equal(idfcFirstBank.CAREERS_URL, 'https://careers.idfcfirst.bank.in/in/en')
  assert.equal(idfcFirstBank.RETAIL_BANKING_URL, 'https://careers.idfcfirst.bank.in/in/en/retail-banking')
  assert.equal(idfcFirstBank.TALENT_COMMUNITY_URL, 'https://careers.idfcfirst.bank.in/in/en/jointalentcommunity')

  assert.equal(idfcFirstBank.hasOfficialCareersHomeSignal(careersHomeHtml), true)
  assert.equal(idfcFirstBank.hasZeroJobSignal(careersHomeHtml), true)
  assert.equal(idfcFirstBank.hasRetailBankingSignal(retailBankingHtml), true)
  assert.equal(idfcFirstBank.hasTalentCommunitySignal(talentCommunityHtml), true)
  assert.equal(idfcFirstBank.pageExposesPublicJobListings(careersHomeHtml), false)
  assert.equal(idfcFirstBank.pageExposesPublicJobListings(retailBankingHtml), false)

  const requestedUrls = []
  const jobs = await idfcFirstBank.createIdfcFirstBankScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === idfcFirstBank.CAREERS_URL) return careersHomeHtml
      if (url === idfcFirstBank.RETAIL_BANKING_URL) return retailBankingHtml
      if (url === idfcFirstBank.TALENT_COMMUNITY_URL) return talentCommunityHtml
      throw new Error(`Unexpected IDFC FIRST Bank fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    idfcFirstBank.CAREERS_URL,
    idfcFirstBank.RETAIL_BANKING_URL,
    idfcFirstBank.TALENT_COMMUNITY_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('IDFC FIRST Bank fails closed when the verified zero-job surface changes or a public job board appears', async () => {
  const idfcFirstBank = await loadIdfcFirstBankModule()

  await assert.rejects(
    idfcFirstBank.createIdfcFirstBankScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /IDFC FIRST Bank official careers home changed/i,
  )

  await assert.rejects(
    idfcFirstBank.createIdfcFirstBankScraper().run({
      fetchText: async (url) => {
        if (url === idfcFirstBank.CAREERS_URL) {
          return careersHomeHtml.replaceAll('0 jobs', '5 jobs')
        }
        if (url === idfcFirstBank.RETAIL_BANKING_URL) return retailBankingHtml
        if (url === idfcFirstBank.TALENT_COMMUNITY_URL) return talentCommunityHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /IDFC FIRST Bank careers home no longer shows the verified zero-job state/i,
  )

  await assert.rejects(
    idfcFirstBank.createIdfcFirstBankScraper().run({
      fetchText: async (url) => {
        if (url === idfcFirstBank.CAREERS_URL) {
          return `${careersHomeHtml}<section class="job-board"><article class="job-card"><a href="/job/123">Product Manager</a></article></section>`
        }
        if (url === idfcFirstBank.RETAIL_BANKING_URL) return retailBankingHtml
        if (url === idfcFirstBank.TALENT_COMMUNITY_URL) return talentCommunityHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /IDFC FIRST Bank careers home now appears to expose public job listings/i,
  )
})
