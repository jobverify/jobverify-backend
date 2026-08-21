import assert from 'node:assert/strict'
import test from 'node:test'

import { withRetry } from '../utils/retry.js'

const loadModule = async () => {
  try {
    return await import('../../scraper/juegostudio/script.js')
  } catch {
    assert.fail('Expected Juego Studio scraper module at ../../scraper/juegostudio/script.js')
  }
}

const JHUB_APPLICATION_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Apply a Job</h1>
    <label>Job Opening:</label>
    <select name="jo_id" class="form-control job_opening" required>
      <option></option>
      <option value="344">3D Artist I / II</option>
      <option value="334">Intern 3D Artist</option>
      <option value="360">Lead Animator</option>
      <option value="345">Senior 3D Artist</option>
      <option value="362">Senior Executive – Finance & Accounts</option>
      <option value="312">UI UX Designer</option>
      <option value="other">Other</option>
    </select>
  </body>
</html>
`

test('Juego Studio falls back to the verified JHub application form when the careers page is Cloudflare-blocked', async () => {
  const juegoStudio = await loadModule()

  const jobs = await juegoStudio.createJuegoStudioScraper({
    now: () => '2026-08-13T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      if (url === juegoStudio.CAREERS_URL) {
        throw new Error(`HTTP 403 for ${juegoStudio.CAREERS_URL}`)
      }
      if (url === juegoStudio.JHUB_APPLICATION_URL) {
        return JHUB_APPLICATION_HTML
      }
      assert.fail(`Unexpected fetchText URL: ${url}`)
    },
    fetchBrowserText: async () => {
      throw new Error(`HTTP 403 for ${juegoStudio.CAREERS_URL}`)
    },
  })

  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      department: job.department,
      positionTitle: job.positionTitle,
      experienceRequired: job.experienceRequired,
      applyUrl: job.applyUrl,
      requisitionId: job.requisitionId,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: '3D Artist I / II',
        location: 'Bangalore, Karnataka, India',
        department: 'Modelling',
        positionTitle: '3D Artist I, 3D Artist II',
        experienceRequired: '2- 4 years',
        applyUrl: 'https://jhub.juegostudio.com/?module=interview&component=application',
        requisitionId: '344',
        scrapedAt: '2026-08-13T00:00:00.000Z',
      },
      {
        title: 'Intern 3D Artist',
        location: 'India',
        department: 'Modelling',
        positionTitle: 'Intern 3d Artist',
        experienceRequired: null,
        applyUrl: 'https://jhub.juegostudio.com/?module=interview&component=application',
        requisitionId: '334',
        scrapedAt: '2026-08-13T00:00:00.000Z',
      },
      {
        title: 'Lead Animator',
        location: 'Bangalore, Karnataka, India',
        department: 'Animation',
        positionTitle: 'Lead Animator',
        experienceRequired: '8+ years',
        applyUrl: 'https://jhub.juegostudio.com/?module=interview&component=application',
        requisitionId: '360',
        scrapedAt: '2026-08-13T00:00:00.000Z',
      },
      {
        title: 'Senior 3D Artist',
        location: 'India',
        department: 'Modelling',
        positionTitle: 'Senior 3D Artist',
        experienceRequired: '5+',
        applyUrl: 'https://jhub.juegostudio.com/?module=interview&component=application',
        requisitionId: '345',
        scrapedAt: '2026-08-13T00:00:00.000Z',
      },
      {
        title: 'Senior Executive - Finance & Accounts',
        location: 'Bangalore, Karnataka, India',
        department: 'Accounts',
        positionTitle: 'Senior Finance Executive',
        experienceRequired: '5+ years',
        applyUrl: 'https://jhub.juegostudio.com/?module=interview&component=application',
        requisitionId: '362',
        scrapedAt: '2026-08-13T00:00:00.000Z',
      },
      {
        title: 'UI UX Designer',
        location: 'Bangalore, Karnataka, India',
        department: 'UI Design',
        positionTitle: 'Senior UI-Designer',
        experienceRequired: '5+ years',
        applyUrl: 'https://jhub.juegostudio.com/?module=interview&component=application',
        requisitionId: '312',
        scrapedAt: '2026-08-13T00:00:00.000Z',
      },
    ],
  )
})

test('Juego Studio still aborts outer retries when both the careers page and JHub fallback are unavailable', async () => {
  const juegoStudio = await loadModule()
  let browserAttempts = 0

  await assert.rejects(
    withRetry(
      () => juegoStudio.createJuegoStudioScraper().run({
        fetchText: async (url) => {
          if (url === juegoStudio.CAREERS_URL) {
            throw new Error(`HTTP 403 for ${juegoStudio.CAREERS_URL}`)
          }
          throw new Error(`HTTP 403 for ${juegoStudio.JHUB_APPLICATION_URL}`)
        },
        fetchBrowserText: async () => {
          browserAttempts += 1
          throw new Error(`HTTP 403 for ${juegoStudio.CAREERS_URL}`)
        },
      }),
      {
        attempts: 2,
        baseDelayMs: 1,
        label: 'outer-juego',
      },
    ),
    (error) => {
      assert.match(
        error.message,
        /\[outer-juego\] Retry aborted after attempt 1\/2\. Last error: HTTP 403 for https:\/\/jhub\.juegostudio\.com\/\?module=interview&component=application/i,
      )
      assert.equal(error.abortRetries, true)
      return true
    },
  )

  assert.equal(browserAttempts, 1)
})
