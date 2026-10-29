import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { readVisibleNativeDocument } from '../utils/visibleNativeHtml.js'
const links = html => readVisibleNativeDocument(html).nodes(n => n.tag === 'a').map(n => n.attrs.href)
test('scoped hiding styles only affect elements within their matching ancestors', () => {
  const html = '<style>.header .desktop .buttons{display:none}</style><header class="header"><div class="desktop"><div class="buttons"><a href="hidden">hidden</a></div></div></header><main><div class="buttons"><a href="careers">Careers</a></div></main>'
  assert.deepEqual(links(html), ['careers'])
})
test('child combinators do not hide deeper descendants', () => {
  assert.deepEqual(links('<style>.header > .buttons{display:none}</style><div class="header"><div><a class="buttons" href="careers">Careers</a></div><a class="buttons" href="hidden">Hidden</a></div>'), ['careers'])
})
test('conditional class selectors remain conservative within their matching scope', () => {
  assert.deepEqual(links('<style>.header:hover .buttons{display:none}</style><div class="header"><a class="buttons" href="hidden">Hidden</a></div><a class="buttons" href="careers">Careers</a>'), ['careers'])
})

for (const selector of [':root', '[data-scope]', ':not(.absent)']) {
  test(`unsupported ancestor ${selector} cannot expose a CSS-hidden job link`, () => {
    const html = `<style>${selector} .job{display:none}</style><html data-scope><body><a class="job" href="hidden">Hidden role</a><a href="careers">Careers</a></body></html>`
    assert.deepEqual(links(html), ['careers'])
  })
}

test('escaped ancestor identifiers cannot expose a CSS-hidden job link', () => {
  assert.deepEqual(links('<style>.sm\\:hidden .job{display:none}</style><div class="sm:hidden"><a class="job" href="hidden">Hidden role</a><a href="careers">Careers</a></div>'), ['careers'])
})

test('namespace ancestor syntax cannot expose a CSS-hidden job link', () => {
  assert.deepEqual(links('<style>*|div .job{display:none}</style><div><a class="job" href="hidden">Hidden role</a><a href="careers">Careers</a></div>'), ['careers'])
})
test('adjacent sibling hiding requires the immediate preceding element', () => {
  assert.deepEqual(links('<style>.toggle + .buttons{display:none}</style><div><span class="toggle"></span><a class="buttons" href="hidden">Hidden</a><a class="buttons" href="careers">Careers</a></div>'), ['careers'])
})
test('general sibling hiding stays within the common parent', () => {
  assert.deepEqual(links('<style>.toggle ~ .buttons{display:none}</style><div><span class="toggle"></span><i></i><a class="buttons" href="hidden">Hidden</a></div><a class="buttons" href="careers">Careers</a>'), ['careers'])
})
test('Seeq current careers buttons remain visible outside the mobile header CSS scope', () => {
  const packet = JSON.parse(gunzipSync(readFileSync(new URL('../../scraper/seeq/careers-20261028.json.gz', import.meta.url))))
  assert.equal(links(packet.body).filter(url => url === 'https://apply.workable.com/seeq/').length, 2)
})
