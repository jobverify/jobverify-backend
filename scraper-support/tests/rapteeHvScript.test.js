import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/rapteehv/script.js')
  } catch {
    assert.fail('Expected RAPTEE HV scraper module at ../../scraper/rapteehv/script.js')
  }
}

test('RAPTEE HV marks the verified public Keka payload as publicly checked even when experience is blank', async () => {
  const raptee = await loadModule()

  const jobs = raptee.extractSearchResults([
    {
      id: '33966',
      title: 'CAS/Class A Modeler',
      departmentName: 'Design',
      experience: null,
      description: 'A CAS/Class A modeler brings shape and form to styling ideas and designs.',
      publishedOn: '2026-08-01T00:00:00.000Z',
      jobType: 2,
      jobLocations: [
        {
          city: 'Chennai',
          state: 'Tamil Nadu',
          countryName: 'India',
          countryCode: 'IN',
        },
      ],
    },
  ], { domain: raptee.EXTERNAL_HANDOFF_URL })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].experienceRequired, null)
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.match(jobs[0].jobDescription, /shape and form to styling ideas/i)
})
