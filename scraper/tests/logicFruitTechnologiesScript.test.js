import assert from 'node:assert/strict'
import test from 'node:test'

const loadLogicFruitModule = async () => {
  try {
    return await import('../logicfruittechnologies/script.js')
  } catch {
    assert.fail(
      'Expected Logic Fruit Technologies scraper module at ../logicfruittechnologies/script.js',
    )
  }
}

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Create Your Future With Us!</h1>
      <p>Navigate your career with the best possibilities.</p>
      <nav>
        <a href="https://www.logic-fruit.com/career/">Career</a>
        <a href="https://www.logic-fruit.com/career/jobs-current-opening/">Current Openings</a>
        <a href="https://www.logic-fruit.com/career/application-form/">Application Form</a>
      </nav>

      <section>
        <h2>All Positions</h2>

        <h2><a href="https://www.logic-fruit.com/career/executive-assistant-to-ceo/">Executive Assistant to CEO</a></h2>
        <ul><li>Gurugram</li></ul>

        <h2><a href="https://www.logic-fruit.com/career/rf-architect/">RF Architect</a></h2>
        <ul><li>Gurugram/Bengaluru</li></ul>

        <h2><a href="https://www.logic-fruit.com/career/verification-lead/">Verification Lead</a></h2>
        <ul><li>Gurugram</li></ul>
      </section>

      <section>
        <h2>FPGA</h2>
        <h2><a href="https://www.logic-fruit.com/career/rf-architect/">RF Architect</a></h2>
        <ul><li>Gurugram/Bengaluru</li></ul>

        <h2><a href="https://www.logic-fruit.com/career/fpga-rtl-engineer/">FPGA RTL Engineer</a></h2>
        <ul><li>Gurugram/Bengaluru</li></ul>
      </section>
    </main>
  </body>
</html>
`

test('Logic Fruit Technologies scraper validates the official careers surface and extracts unique public openings', async () => {
  const logicFruit = await loadLogicFruitModule()

  assert.equal(logicFruit.SOURCE, 'logicfruittechnologies')
  assert.equal(logicFruit.COMPANY, 'Logic Fruit Technologies')
  assert.equal(logicFruit.CAREERS_URL, 'https://www.logic-fruit.com/career/jobs-current-opening/')
  assert.equal(logicFruit.APPLY_URL, 'https://www.logic-fruit.com/career/application-form/')
  assert.equal(logicFruit.hasOfficialCareersSignal(careersPageHtml), true)

  assert.deepEqual(logicFruit.extractOpenings(careersPageHtml), [
    {
      title: 'Executive Assistant to CEO',
      location: 'Gurugram, India',
      city: 'Gurgaon',
      sourceUrl: 'https://www.logic-fruit.com/career/executive-assistant-to-ceo/',
      applyUrl: 'https://www.logic-fruit.com/career/application-form/',
      remoteStatus: 'On-site',
    },
    {
      title: 'RF Architect',
      location: 'Gurugram / Bengaluru, India',
      city: 'Gurgaon',
      sourceUrl: 'https://www.logic-fruit.com/career/rf-architect/',
      applyUrl: 'https://www.logic-fruit.com/career/application-form/',
      remoteStatus: 'On-site',
    },
    {
      title: 'Verification Lead',
      location: 'Gurugram, India',
      city: 'Gurgaon',
      sourceUrl: 'https://www.logic-fruit.com/career/verification-lead/',
      applyUrl: 'https://www.logic-fruit.com/career/application-form/',
      remoteStatus: 'On-site',
    },
    {
      title: 'FPGA RTL Engineer',
      location: 'Gurugram / Bengaluru, India',
      city: 'Gurgaon',
      sourceUrl: 'https://www.logic-fruit.com/career/fpga-rtl-engineer/',
      applyUrl: 'https://www.logic-fruit.com/career/application-form/',
      remoteStatus: 'On-site',
    },
  ])
})

test('Logic Fruit Technologies run decorates the official openings with shared scraper metadata', async () => {
  const logicFruit = await loadLogicFruitModule()

  const requestedUrls = []
  const jobs = await logicFruit.createLogicFruitTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersPageHtml
    },
  })

  assert.deepEqual(requestedUrls, [logicFruit.CAREERS_URL])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].company, 'Logic Fruit Technologies')
  assert.equal(jobs[0].source, 'logicfruittechnologies')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
  assert.notEqual(jobs[0].jobId, jobs[1].jobId)
})

test('Logic Fruit Technologies fails closed when the verified public openings surface changes', async () => {
  const logicFruit = await loadLogicFruitModule()

  await assert.rejects(
    logicFruit.createLogicFruitTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Jobs</h1></body></html>',
    }),
    /verified official public careers surface/i,
  )
})
