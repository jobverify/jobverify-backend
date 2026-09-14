import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('Arka Fincap validates only title text without backtracking across repeated page content', () => {
  const moduleUrl = new URL('../../scraper/arkafincap/script.js', import.meta.url).href
  const child = spawnSync(process.execPath, ['--input-type=module'], {
    input: `
      import { hasOfficialHomepageSignal, hasOfficialCareersPageSignal } from ${JSON.stringify(moduleUrl)};
      const links = '<a href="/life-at-arka">Careers</a><a href="https://arkafincap.zohorecruit.in/jobs/Careers">Job Openings</a>';
      const repeated = '<p>Arka Fincap - Expert Financial Solutions Services Life at Arka - Work Culture, Careers &amp; Growth</p>'.repeat(4000);
      const body = links + 'Our Culture Why Join Us? Join Us' + repeated;
      const home = '<title>Arka Fincap &#8211; Expert Financial Solutions &amp; Services</title>';
      const careers = '<title>Life at Arka &#8211; Work Culture, Careers &amp; Growth</title>';
      console.log(JSON.stringify([
        hasOfficialHomepageSignal(home + body),
        hasOfficialCareersPageSignal(careers + body),
        hasOfficialHomepageSignal('<title>Unrelated</title>' + body),
        hasOfficialCareersPageSignal('<title>Unrelated</title>' + body),
      ]));
    `,
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  })
  assert.equal(child.error, undefined, `Title checks must finish promptly: ${child.error?.message}`)
  assert.equal(child.status, 0, child.stderr)
  assert.deepEqual(JSON.parse(child.stdout.trim()), [true, true, false, false])
})
