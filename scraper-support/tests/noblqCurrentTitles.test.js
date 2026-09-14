import assert from 'node:assert/strict'
import test from 'node:test'
import { hasOfficialHomepageSignal, hasOfficialAboutUsSignal } from '../../scraper/noblq/script.js'

const home = '<title>Noblq | Digital Transformation, Enterprise Technology and AI</title><a href="/about-us">About Us</a><a href="/contact-us">Contact Us</a><p>reachout@noblq.com +1 972 401 3771</p>'
const about = '<title>About Noblq | Driven by Purpose, Built to Solve</title><h2>CAREERS FOR CURIOUS PROBLEM SOLVERS</h2><a href="https://talent.noblq.com/jobs/Careers">Explore Opportunities</a>'
test('NoblQ recognizes current titles and the current careers section with its exact tenant handoff', () => {
  assert.equal(hasOfficialHomepageSignal(home), true)
  assert.equal(hasOfficialAboutUsSignal(about), true)
})
test('NoblQ keeps brand, contact and exact careers tenant validation', () => {
  assert.equal(hasOfficialHomepageSignal(home.replace('reachout@noblq.com', 'someone@example.com')), false)
  assert.equal(hasOfficialHomepageSignal(home.replace('<title>Noblq', '<title>Other')), false)
  assert.equal(hasOfficialAboutUsSignal(about.replace('talent.noblq.com', 'talent.example.com')), false)
})
