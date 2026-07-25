import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const loadKnowledgeLensModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Knowledge Lens scraper module at ./script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const retiredHomepageHtml = fs.readFileSync(path.join(currentDir, 'fixtures/retired-homepage.html'), 'utf8')
const parentCareersHtml = fs.readFileSync(path.join(currentDir, 'fixtures/kalypso-careers.html'), 'utf8')

test('Knowledge Lens scraper validates the verified retired-brand homepage and parent careers zero-job surfaces', async () => {
  const knowledgeLens = await loadKnowledgeLensModule()

  assert.equal(knowledgeLens.SOURCE, 'knowledgelens')
  assert.equal(knowledgeLens.COMPANY, 'Knowledge Lens')
  assert.equal(knowledgeLens.HOMEPAGE_URL, 'https://www.knowledgelens.com/')
  assert.equal(
    knowledgeLens.RETIRED_ANNOUNCEMENT_URL,
    'https://kalypso.com/about/press/releases/rockwell-automation-announces-acquisition-of-knowledge-lens',
  )
  assert.equal(knowledgeLens.PARENT_CAREERS_URL, 'https://kalypso.com/careers')
  assert.equal(knowledgeLens.hasRetiredHomepageSignal(retiredHomepageHtml), true)
  assert.equal(knowledgeLens.hasParentCareersSignal(parentCareersHtml), true)
  assert.equal(knowledgeLens.hasBrandSpecificOpeningsSignal(parentCareersHtml), false)
})

test('Knowledge Lens scraper returns no jobs while the retired-brand homepage and parent careers page remain stable', async () => {
  const knowledgeLens = await loadKnowledgeLensModule()
  const requestedUrls = []

  const jobs = await knowledgeLens.createKnowledgeLensScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === knowledgeLens.HOMEPAGE_URL) {
        return {
          status: 200,
          url: knowledgeLens.RETIRED_ANNOUNCEMENT_URL,
          html: retiredHomepageHtml,
        }
      }

      if (url === knowledgeLens.PARENT_CAREERS_URL) {
        return {
          status: 200,
          url,
          html: parentCareersHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [knowledgeLens.HOMEPAGE_URL, knowledgeLens.PARENT_CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Knowledge Lens default fetch is bounded by a timeout signal', async () => {
  const knowledgeLens = await loadKnowledgeLensModule()
  let capturedInit = null

  const page = await knowledgeLens.defaultFetchPage(knowledgeLens.HOMEPAGE_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        status: 200,
        url: knowledgeLens.RETIRED_ANNOUNCEMENT_URL,
        text: async () => retiredHomepageHtml,
      }
    },
  })

  assert.equal(page.status, 200)
  assert.equal(page.url, knowledgeLens.RETIRED_ANNOUNCEMENT_URL)
  assert.equal(page.html, retiredHomepageHtml)
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})

test('Knowledge Lens scraper fails closed when the retired-brand or parent-careers contract drifts', async () => {
  const knowledgeLens = await loadKnowledgeLensModule()

  await assert.rejects(
    knowledgeLens.createKnowledgeLensScraper().run({
      fetchPage: async (url) => {
        if (url === knowledgeLens.HOMEPAGE_URL) {
          return {
            status: 200,
            url: knowledgeLens.HOMEPAGE_URL,
            html: retiredHomepageHtml,
          }
        }

        return {
          status: 200,
          url,
          html: parentCareersHtml,
        }
      },
    }),
    /retired brand homepage/i,
  )

  await assert.rejects(
    knowledgeLens.createKnowledgeLensScraper().run({
      fetchPage: async (url) => {
        if (url === knowledgeLens.HOMEPAGE_URL) {
          return {
            status: 200,
            url: knowledgeLens.RETIRED_ANNOUNCEMENT_URL,
            html: retiredHomepageHtml,
          }
        }

        return {
          status: 200,
          url,
          html: '<html><head><title>Careers</title></head><body>Broken</body></html>',
        }
      },
    }),
    /parent careers page/i,
  )

  await assert.rejects(
    knowledgeLens.createKnowledgeLensScraper().run({
      fetchPage: async (url) => {
        if (url === knowledgeLens.HOMEPAGE_URL) {
          return {
            status: 200,
            url: knowledgeLens.RETIRED_ANNOUNCEMENT_URL,
            html: retiredHomepageHtml,
          }
        }

        return {
          status: 200,
          url,
          html: parentCareersHtml.replace(
            '</body>',
            '<section><h2>Knowledge Lens Open Positions</h2></section></body>',
          ),
        }
      },
    }),
    /brand-specific openings/i,
  )
})
