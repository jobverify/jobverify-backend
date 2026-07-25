import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html>
  <head><title>Current Job Openings at Omninos | Grow Your Career With Us</title></head>
  <body>
    <h1>Current Openings at Omninos for Technology and Digital Professionals</h1>
    <span class="designation">UI/UX Designer</span>
    <span class="location">Mohali, India <i class="fad fa-angle-right"></i></span>
    <span class="designation">Product Manager</span>
    <span class="location">Mohali, India <i class="fad fa-angle-right"></i></span>
    <span class="designation">Intern Android Developer</span>
    <span class="location">Mohali, India <i class="fad fa-angle-right"></i></span>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../omninossolutions/script.js')
  } catch {
    assert.fail('Expected Omninos Solutions scraper module at ../omninossolutions/script.js')
  }
}

test('Omninos Solutions extracts same-page current opening role cards', async () => {
  const omninos = await loadScriptModule()

  assert.equal(omninos.hasOfficialCareersSignal(careersHtml), true)

  const jobs = await omninos.run({
    fetchText: async () => careersHtml,
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [
    {
      title: 'UI/UX Designer',
      company: 'Omninos Solutions',
      location: 'Mohali, India',
      country: 'India',
      sourceUrl: 'https://omninos.in/current-opening.php',
      applyUrl: 'https://omninos.in/current-opening.php',
      link: 'https://omninos.in/current-opening.php',
      source: 'omninossolutions',
      scrapedAt: '2026-07-18T00:00:00.000Z',
    },
    {
      title: 'Product Manager',
      company: 'Omninos Solutions',
      location: 'Mohali, India',
      country: 'India',
      sourceUrl: 'https://omninos.in/current-opening.php',
      applyUrl: 'https://omninos.in/current-opening.php',
      link: 'https://omninos.in/current-opening.php',
      source: 'omninossolutions',
      scrapedAt: '2026-07-18T00:00:00.000Z',
    },
    {
      title: 'Intern Android Developer',
      company: 'Omninos Solutions',
      location: 'Mohali, India',
      country: 'India',
      sourceUrl: 'https://omninos.in/current-opening.php',
      applyUrl: 'https://omninos.in/current-opening.php',
      link: 'https://omninos.in/current-opening.php',
      source: 'omninossolutions',
      scrapedAt: '2026-07-18T00:00:00.000Z',
    },
  ])
})
