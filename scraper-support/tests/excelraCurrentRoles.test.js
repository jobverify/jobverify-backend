import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createExcelraKnowledgeSolutionsScraper, extractVisibleJobCards, extractWordpressRenderedContent } from '../../scraper/excelraknowledgesolutions/script.js'

const payload = JSON.parse(readFileSync(new URL('./fixtures/excelraknowledgesolutions/current-openings.json', import.meta.url), 'utf8'))
const html = payload[0].content.rendered
const run = (page = html) => createExcelraKnowledgeSolutionsScraper().run({ fetchJson: async () => [{ ...payload[0], content: { rendered: page } }], fetchText: () => assert.fail('Healthy API must not fall back') })

test('Excelra accounts for all eleven current cards and returns seven explicit India roles with real application URLs', async () => {
  const cards = extractVisibleJobCards(html)
  assert.equal(cards.length, 11)
  assert.equal(cards.filter(job => job.country === 'United States').length, 4)
  const jobs = await run()
  assert.equal(jobs.length, 7)
  assert.equal(new Set(jobs.map(job => job.jobId)).size, 7)
  assert.ok(jobs.every(job => job.country === 'India' && job.applyUrl === 'https://excelra.darwinbox.in/ms/candidatev2/main/careers/allJobs'))
  assert.ok(jobs.every(job => job.sourceUrl === 'https://www.excelra.com/careers/'))
  assert.equal(jobs.find(job => job.title === 'Sr Gen AI Engineer').experienceRequired, null)
  assert.equal(jobs.find(job => job.title === 'Software Developer').experienceRequired, '5 – 10 Years')
})

test('Excelra detects missing cards fields and never manufactures an undefined apply link', async () => {
  for (const page of [
    html.replace('Scientific Informatics Consultant</h4>', '</h4>'),
    html.replace('<strong> Massachusetts, United States</strong>', ''),
    html.replace('url=&#8221;https://excelra.darwinbox.in/ms/candidatev2/main/careers/allJobs&#8221;', 'url=&#8221;https://unrelated.example/apply&#8221;'),
  ]) await assert.rejects(run(page), /incomplete|card|application|location/i)
})

test('Excelra rejects unknown geography without publishing a partial India snapshot', async () => {
  await assert.rejects(run(html.replace('Hyderabad, India', 'Remote')), /location|scope/i)
  await assert.rejects(run(html.replace('Hyderabad, India', 'Indianapolis, IN')), /location|scope/i)
})

test('Excelra requires an identified careers WordPress record and does not accept arbitrary API pages', () => {
  assert.equal(extractWordpressRenderedContent([{ ...payload[0], slug: 'contact' }]), '')
  assert.equal(extractWordpressRenderedContent([{ ...payload[0], link: 'https://unrelated.example/careers/' }]), '')
})

test('Excelra detects card class drift independently of the parser selector', async () => {
  await assert.rejects(run(html.replace('display-2 m-0 p-0 custom-theme-color', 'new-job-title')), /incomplete|card/i)
})
