import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const loadDryRunRunner = async () => {
  const originalArgv = [...process.argv]
  process.argv = [...process.argv.filter((arg) => arg !== '--dry-run'), '--dry-run']

  try {
    return await import(`../runner.js?dry-run-artifact-test=${Date.now()}`)
  } finally {
    process.argv = originalArgv
  }
}

test('a failed dry run clears stale jobs.json output instead of leaving old data behind', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobify-dry-run-'))
  const dryRunFile = path.join(tempDir, 'jobs.json')
  fs.writeFileSync(dryRunFile, '[{"title":"stale job"}]\n', 'utf8')

  const runner = await loadDryRunRunner()
  assert.equal(typeof runner.runScraper, 'function')

  const result = await runner.runScraper({
    name: 'broken-source',
    provider: { adapter: 'workday' },
    dryRunFile,
    run: async () => {
      throw new Error('source drift')
    },
  })

  assert.equal(result.success, false)
  assert.equal(fs.existsSync(dryRunFile), false)

  fs.rmSync(tempDir, { recursive: true, force: true })
})

test('dry-run snapshot options keep public experience enrichment enabled by default', async () => {
  const runner = await loadDryRunRunner()

  assert.equal(typeof runner.buildDryRunSnapshotOptions, 'function')
  assert.equal(typeof runner.resolveDryRunMaxJobsToEnrich, 'function')

  const options = runner.buildDryRunSnapshotOptions()

  assert.equal(options.enrichPublicExperience, true)
  assert.equal(options.experienceEnrichmentConcurrency, 2)
  assert.equal(options.maxJobsToEnrich, null)
})

test('dry-run runner snapshots recover missing experience from the official public job page', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobify-dry-run-enrichment-'))
  const dryRunFile = path.join(tempDir, 'jobs.json')
  const runner = await loadDryRunRunner()
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://careers.jobify.dev/jobs/cloud-engineer')

    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return String(name).toLowerCase() === 'content-type'
            ? 'text/html; charset=utf-8'
            : null
        },
      },
      text: async () => `
        <html>
          <body>
            <h1>Cloud Engineer</h1>
            <section>
              <h2>Job Description</h2>
              <p>Build cloud infrastructure and automation platforms.</p>
              <p>Required Experience: 5</p>
            </section>
          </body>
        </html>
      `,
    }
  }

  try {
    const result = await runner.runScraper({
      name: 'public-experience-source',
      provider: { adapter: 'custom' },
      dryRunFile,
      run: async () => [{
        title: 'Cloud Engineer',
        company: 'Example Corp',
        location: 'Hyderabad, India',
        city: 'Hyderabad',
        link: 'https://careers.jobify.dev/jobs/cloud-engineer',
        sourceUrl: 'https://careers.jobify.dev/jobs/cloud-engineer',
        applyUrl: 'https://careers.jobify.dev/jobs/cloud-engineer',
        experienceRequired: null,
      }],
    })

    assert.equal(result.success, true)

    const snapshot = JSON.parse(fs.readFileSync(dryRunFile, 'utf8'))
    assert.equal(snapshot.length, 1)
    assert.equal(snapshot[0].experienceRequired, '5 years')
  } finally {
    globalThis.fetch = originalFetch
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('dry-run runner skips public-page refetch when the scraper already returns rich experience-backed job text', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobify-dry-run-rich-source-'))
  const dryRunFile = path.join(tempDir, 'jobs.json')
  const runner = await loadDryRunRunner()
  const originalFetch = globalThis.fetch
  let fetchCount = 0

  globalThis.fetch = async () => {
    fetchCount += 1
    throw new Error('dry-run enrichment should not refetch this source-rich job')
  }

  try {
    const result = await runner.runScraper({
      name: 'rich-source',
      provider: { adapter: 'custom' },
      dryRunFile,
      run: async () => [{
        title: 'Platform Engineer',
        company: 'Example Corp',
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        link: 'https://careers.jobify.dev/jobs/platform-engineer',
        sourceUrl: 'https://careers.jobify.dev/jobs/platform-engineer',
        applyUrl: 'https://careers.jobify.dev/jobs/platform-engineer',
        experienceRequired: '5-8 Years',
        jobDescription: `
          Role Objective: Build and evolve internal platform engineering systems that support order orchestration,
          inventory workflows, and high-availability fulfillment operations across India. Responsibilities include
          designing backend services, maintaining AWS infrastructure, improving Kubernetes-based deployments, driving
          observability, and collaborating with security, data, and product teams to deliver resilient software.
        `,
      }],
    })

    assert.equal(result.success, true)
    assert.equal(fetchCount, 0)

    const snapshot = JSON.parse(fs.readFileSync(dryRunFile, 'utf8'))
    assert.equal(snapshot.length, 1)
    assert.equal(snapshot[0].experienceRequired, '5-8 Years')
    assert.match(snapshot[0].jobDescription || '', /platform engineering systems/i)
  } finally {
    globalThis.fetch = originalFetch
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('dry-run runner enriches every job in large sources by default', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobify-dry-run-limit-'))
  const dryRunFile = path.join(tempDir, 'jobs.json')
  const runner = await loadDryRunRunner()
  const originalFetch = globalThis.fetch
  let fetchCount = 0

  globalThis.fetch = async (url) => {
    fetchCount += 1

    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return String(name).toLowerCase() === 'content-type'
            ? 'text/html; charset=utf-8'
            : null
        },
      },
      text: async () => `
        <html>
          <body>
            <h1>${String(url).split('/').at(-1)?.replace(/-/g, ' ')}</h1>
            <section>
              <h2>Job Description</h2>
              <p>Build and operate distributed production systems for internal platforms.</p>
              <p>Required Experience: 4</p>
            </section>
          </body>
        </html>
      `,
    }
  }

  try {
    const result = await runner.runScraper({
      name: 'large-public-experience-source',
      provider: { adapter: 'custom' },
      dryRunFile,
      run: async () => Array.from({ length: 25 }, (_, index) => ({
        title: `Platform Engineer ${index + 1}`,
        company: 'Example Corp',
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        link: `https://careers.jobify.dev/jobs/platform-engineer-${index + 1}`,
        sourceUrl: `https://careers.jobify.dev/jobs/platform-engineer-${index + 1}`,
        applyUrl: `https://careers.jobify.dev/jobs/platform-engineer-${index + 1}`,
        experienceRequired: null,
      })),
    })

    assert.equal(result.success, true)
    assert.equal(fetchCount, 25)

    const snapshot = JSON.parse(fs.readFileSync(dryRunFile, 'utf8'))
    assert.equal(snapshot.length, 25)
    assert.equal(snapshot[0].experienceRequired, '4 years')
    assert.equal(snapshot[24].experienceRequired, '4 years')
  } finally {
    globalThis.fetch = originalFetch
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
