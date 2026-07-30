import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeScrapedJob } from '../scraper/utils/normalizeScrapedJob.js'

test('normalizes a high-confidence experience requirement from a description when the scraper omits it', () => {
  const normalized = normalizeScrapedJob({
    title: 'Game Designer II',
    company: 'Electronic Arts',
    location: 'Hyderabad, India',
    sourceUrl: 'https://jobs.example.com/game-designer-ii',
    description: 'What You Bring: 5+ years of game design experience.',
    experienceRequired: null,
  })

  assert.equal(normalized.experienceRequired, '5+ years')
})

test('preserves an experience value provided by the scraper', () => {
  const normalized = normalizeScrapedJob({
    title: 'Game Designer II',
    company: 'Electronic Arts',
    location: 'Hyderabad, India',
    sourceUrl: 'https://jobs.example.com/game-designer-ii',
    description: 'What You Bring: 5+ years of game design experience.',
    experienceRequired: '4-6 years',
  })

  assert.equal(normalized.experienceRequired, '4-6 years')
})

test('normalizes internship roles without explicit years into a no-experience requirement', () => {
  const normalized = normalizeScrapedJob({
    title: 'QA Engineer Intern',
    company: 'Example Labs',
    location: 'Hyderabad, India',
    sourceUrl: 'https://jobs.example.com/qa-engineer-intern',
    description: 'Join our internship program and work alongside experienced QA engineers on web and mobile application testing.',
    experienceRequired: null,
  })

  assert.equal(normalized.experienceRequired, 'No experience required')
})

test('normalizes a title-only year range when the official listing title carries the requirement', () => {
  const normalized = normalizeScrapedJob({
    title: '1-10yrs Application for Cyber- Kolkata DN 57 - RDC',
    company: 'PwC',
    location: 'Kolkata, India',
    sourceUrl: 'https://jobs.example.com/pwc-cyber-role',
    description: null,
    experienceRequired: null,
  })

  assert.equal(normalized.experienceRequired, '1-10yrs')
})

test('normalizes an exact year requirement when the description explicitly says years of experience', () => {
  const normalized = normalizeScrapedJob({
    title: 'Senior Maintenance Manager',
    company: 'Example Motors',
    location: 'Pune, India',
    sourceUrl: 'https://jobs.example.com/maintenance-manager',
    description: 'Candidates must bring 10 years of experience in automotive maintenance operations.',
    experienceRequired: null,
  })

  assert.equal(normalized.experienceRequired, '10 years')
})

test('does not mistake company history for a job experience requirement', () => {
  const normalized = normalizeScrapedJob({
    title: 'Cloud Engineer',
    company: 'Quest Global',
    location: 'Bengaluru, India',
    sourceUrl: 'https://jobs.example.com/cloud-engineer',
    description: 'At Quest Global, with over 25 years as an engineering services provider, we believe in the power of doing things differently.',
    experienceRequired: null,
  })

  assert.equal(normalized.experienceRequired, null)
})
