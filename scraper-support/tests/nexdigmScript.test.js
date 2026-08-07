import assert from 'node:assert/strict'
import test from 'node:test'

const loadNexdigmModule = async () => {
  try {
    return await import('../../scraper/nexdigm/script.js')
  } catch {
    assert.fail('Expected Nexdigm scraper module at ../../scraper/nexdigm/script.js')
  }
}

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Nexdigm | Explore Career Opportunities</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <h2>Job Search</h2>
      <p>Current Opportunities</p>
      <p>Join a team that allows you to grow and gives you the freedom to make creative decisions</p>
      <a href="https://www.nexdigm.com/careers/current-openings/">View All</a>
      <a href="https://www.nexdigm.com/careers/current-openings/">Current Openings</a>
    </main>
  </body>
</html>
`

const currentOpeningsShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Opportunities | Job Openings | Nexdigm</title>
  </head>
  <body>
    <div class="inside-content">
      <h1 class="main-hd" style="display:none;">Current Openings</h1>
      <form id="my_form">
        <div class="join-formarea">
          <div class="result-container-top2 result-row">
            <div class="form-control2 search-left">
              <div class="input-area">
                <input type="text" placeholder="Search by Position Name, Location Name etc" id="ser" name="ser">
              </div>
              <div class="input-area2">
                <input type="hidden" id="arr" name="arr" value="error code: 502 ">
              </div>
              <div class="input-area3">
                <input class="btn" id="submitbutton" type="submit" value="Search">
              </div>
            </div>
          </div>
        </div>
      </form>
      <div class="result-container" id="load_data"></div>
      <a href="#" id="loadmore">Load More</a>
    </div>
    <script>
      jQuery(document).ready(function() {
        jQuery("#my_form").submit(function(event){
          event.preventDefault();
          var form_data = new FormData(this);
          jQuery.ajax({
            url : "https://www.nexdigm.com/joblist.php",
            type: "POST",
            data : form_data,
            contentType: false,
            cache: false,
            processData: false
          }).done(function(response){
            jQuery("#load_data").html(response);
          });
        });
      });
    </script>
  </body>
</html>
`

test('Nexdigm helpers stay pinned to the verified August 3, 2026 careers shell and upstream-error openings shell', async () => {
  const nexdigm = await loadNexdigmModule()

  assert.equal(nexdigm.SOURCE, 'nexdigm')
  assert.equal(nexdigm.COMPANY, 'Nexdigm')
  assert.equal(nexdigm.VERIFIED_ON, '2026-08-03')
  assert.equal(nexdigm.HOMEPAGE_URL, 'https://www.nexdigm.com/')
  assert.equal(nexdigm.CAREERS_URL, 'https://www.nexdigm.com/careers/')
  assert.equal(
    nexdigm.CURRENT_OPENINGS_URL,
    'https://www.nexdigm.com/careers/current-openings/',
  )
  assert.equal(nexdigm.CURRENT_OPENINGS_DATA_URL, 'https://www.nexdigm.com/joblist.php')
  assert.equal(nexdigm.CURRENT_OPENINGS_UPSTREAM_ERROR, 'error code: 502')
  assert.equal(nexdigm.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    nexdigm.extractCurrentOpeningsUrl(careersHtml),
    'https://www.nexdigm.com/careers/current-openings/',
  )
  assert.equal(nexdigm.hasVerifiedCurrentOpeningsShell(currentOpeningsShellHtml), true)
  assert.equal(
    nexdigm.extractCurrentOpeningsErrorValue(currentOpeningsShellHtml),
    'error code: 502',
  )
  assert.equal(
    nexdigm.hasVerifiedUpstreamErrorCurrentOpeningsState(currentOpeningsShellHtml),
    true,
  )
  assert.doesNotThrow(() => nexdigm.assertNoPublicJobInventory(currentOpeningsShellHtml))
})

test('assertNoPublicJobInventory trips when public Nexdigm job detail links reappear', async () => {
  const nexdigm = await loadNexdigmModule()
  const publicJobsHtml = currentOpeningsShellHtml.replace(
    '<div class="result-container" id="load_data"></div>',
    `
    <div class="result-container" id="load_data">
      <div class="careerdata">
        <a href="https://www.nexdigm.com/careers/career-details/?id=a69c23b6d80360">Consultant - Bengaluru - Indirect Tax</a>
      </div>
    </div>
    `,
  )

  assert.throws(
    () => nexdigm.assertNoPublicJobInventory(publicJobsHtml),
    /now exposes public job detail links/i,
  )
})

test('run validates the verified Nexdigm careers shell and returns no jobs while the reviewed upstream-error openings state persists', async () => {
  const nexdigm = await loadNexdigmModule()
  const requestedUrls = []

  const jobs = await nexdigm.createNexdigmScraper({
    now: () => '2026-08-03T12:30:00.000Z',
  }).run({
    fetchHtml: async (url) => {
      requestedUrls.push(url)

      if (url === nexdigm.CAREERS_URL) return careersHtml
      if (url === nexdigm.CURRENT_OPENINGS_URL) return currentOpeningsShellHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.nexdigm.com/careers/',
    'https://www.nexdigm.com/careers/current-openings/',
  ])
  assert.deepEqual(jobs, [])
})

test('run fails closed when the verified Nexdigm careers shell or reviewed upstream-error openings state drifts materially', async () => {
  const nexdigm = await loadNexdigmModule()

  await assert.rejects(
    nexdigm.createNexdigmScraper().run({
      fetchHtml: async (url) => {
        if (url === nexdigm.CAREERS_URL) {
          return '<html><body><h1>Careers</h1><a href="/apply">Apply</a></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified careers page no longer matches/i,
  )

  await assert.rejects(
    nexdigm.createNexdigmScraper().run({
      fetchHtml: async (url) => {
        if (url === nexdigm.CAREERS_URL) return careersHtml
        if (url === nexdigm.CURRENT_OPENINGS_URL) {
          return currentOpeningsShellHtml.replace('error code: 502', 'Nexdigm Private Limited')
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /reviewed upstream-error state/i,
  )
})
