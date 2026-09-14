import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  extractPublicRoles,
  hasOfficialCareersPageSignal,
  run,
} from '../../scraper/filo/script.js'

const currentEmptyHtml = `
  <html lang="en-US"><head>
    <link rel="canonical" href="https://askfilo.com/careers">
    <title>Job Opportunities At Filo. Check For Recent Career Options</title>
  </head><body>
    <h1>Career at Filo</h1><h3>JOIN OUR TEAM</h3>
    <p>Departments</p><option>All Departments</option>
    <footer>© Copyright Filo EdTech INC. 2025</footer>
    <script id="__NEXT_DATA__" type="application/json">{
      "props":{
        "userCountryCode":"GR",
        "pageProps":{
          "countryCode":"GR",
          "data":[{"departmentId":0,"departmentName":"All Departments","jobs":[]}]
        }
      },
      "page":"/careers"
    }</script>
  </body></html>
`

test('Filo accepts the current explicit empty department-array payload', async () => {
  assert.equal(hasOfficialCareersPageSignal(currentEmptyHtml), true)
  assert.deepEqual(extractPublicRoles(currentEmptyHtml), [])
  const jobs = await run({
    fetchText: async (url) => {
      assert.equal(url, CAREERS_URL)
      return currentEmptyHtml
    },
  })
  assert.deepEqual(jobs, [])
})

test('Filo fails closed if the unverified department-array shape contains jobs', () => {
  const unverifiedJobHtml = currentEmptyHtml.replace(
    '"jobs":[]',
    '"jobs":[{"jobTitle":"New role","slug":"new-role"}]',
  )
  assert.throws(
    () => extractPublicRoles(unverifiedJobHtml),
    /non-empty current careers payload requires review/i,
  )
})
