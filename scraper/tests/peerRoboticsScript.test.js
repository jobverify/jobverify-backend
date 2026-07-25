import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
  <!doctype html>
  <html data-wf-domain="peerrobotics.ai" lang="en">
    <head>
      <title>Peer Robotics | Collaborative Mobile Robots</title>
    </head>
    <body>
      <h1>designed to work with humans</h1>
      <p>enabling automation using collaborative mobile robots</p>
      <p>Shaping the future of automation, with human-centric robots</p>
      <p>Peer Robotics transforms manufacturing through intelligent mobile robots that learn directly from humans.</p>
      <footer>© 2025 Peer Robotics. All rights reserved.</footer>
    </body>
  </html>
`

const aboutHtml = `
  <!doctype html>
  <html data-wf-domain="peerrobotics.ai" lang="en">
    <head>
      <title>About Peer Robotics | Revolutionizing the Robotics Industry</title>
      <meta
        name="description"
        content="Learn about Peer Robotics and our mission to revolutionize the robotics industry. Explore our team, expertise, and commitment to innovation."
      >
    </head>
    <body>
      <section>
        <h2>What we do</h2>
        <h3>innovating a manufacturing future together</h3>
        <p>
          At Peer Robotics, we&#x27;re revolutionizing manufacturing with our deep understanding of the industry&#x27;s core challenges.
        </p>
      </section>
      <section class="section-hire">
        <h4>We’re hiring</h4>
        <p>Our team is growing fast and we’re always looking for smart people.</p>
        <a href="https://wellfound.com/company/peer-robotics/jobs">View roles</a>
      </section>
      <section class="section-faq">
        <h2>faq<span>s</span></h2>
        <p>Where is Peer Robotics based out of?</p>
        <p>We are headquartered out of the USA with our R&amp;D center in India.</p>
      </section>
      <footer>© 2025 Peer Robotics. All rights reserved.</footer>
    </body>
  </html>
`

const wellfoundChallengeHtml = `
  <html lang="en">
    <head>
      <title>wellfound.com</title>
    </head>
    <body style="margin:0">
      <p id="cmsg">Please enable JS and disable any ad blocker</p>
      <script src="https://ct.captcha-delivery.com/c.js"></script>
    </body>
  </html>
`

const loadPeerRoboticsModule = async () => {
  try {
    return await import('../peerrobotics/script.js')
  } catch {
    assert.fail('Expected Peer Robotics scraper module at ../peerrobotics/script.js')
  }
}

test('Peer Robotics validates the verified homepage, about-page hiring handoff, and Wellfound challenge gate', async () => {
  const peerRobotics = await loadPeerRoboticsModule()

  assert.equal(peerRobotics.SOURCE, 'peerrobotics')
  assert.equal(peerRobotics.COMPANY, 'Peer Robotics')
  assert.equal(peerRobotics.HOMEPAGE_URL, 'https://peerrobotics.ai/')
  assert.equal(peerRobotics.ABOUT_URL, 'https://peerrobotics.ai/about')
  assert.equal(peerRobotics.WELLFOUND_JOBS_URL, 'https://wellfound.com/company/peer-robotics/jobs')
  assert.equal(peerRobotics.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(peerRobotics.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(
    peerRobotics.extractWellfoundJobsUrl(aboutHtml),
    'https://wellfound.com/company/peer-robotics/jobs',
  )
  assert.equal(
    peerRobotics.isVerifiedWellfoundChallenge({
      status: 403,
      url: 'https://wellfound.com/company/peer-robotics/jobs',
      html: wellfoundChallengeHtml,
    }),
    true,
  )
})

test('Peer Robotics returns no jobs while the verified Wellfound board remains challenge-gated', async () => {
  const peerRobotics = await loadPeerRoboticsModule()
  const requestedUrls = []

  const jobs = await peerRobotics.createPeerRoboticsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === peerRobotics.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === peerRobotics.ABOUT_URL) {
        return { status: 200, url, html: aboutHtml }
      }

      if (url === peerRobotics.WELLFOUND_JOBS_URL) {
        return { status: 403, url, html: wellfoundChallengeHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    peerRobotics.HOMEPAGE_URL,
    peerRobotics.ABOUT_URL,
    peerRobotics.WELLFOUND_JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Peer Robotics fails closed when the verified homepage, hiring handoff, or challenge gate drifts', async () => {
  const peerRobotics = await loadPeerRoboticsModule()

  await assert.rejects(
    peerRobotics.createPeerRoboticsScraper().run({
      fetchPage: async (url) => {
        if (url === peerRobotics.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>Placeholder</body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    peerRobotics.createPeerRoboticsScraper().run({
      fetchPage: async (url) => {
        if (url === peerRobotics.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === peerRobotics.ABOUT_URL) {
          return {
            status: 200,
            url,
            html: aboutHtml.replace(
              'https://wellfound.com/company/peer-robotics/jobs',
              'https://wellfound.com/company/peer-robotics',
            ),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /hiring handoff/i,
  )

  await assert.rejects(
    peerRobotics.createPeerRoboticsScraper().run({
      fetchPage: async (url) => {
        if (url === peerRobotics.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === peerRobotics.ABOUT_URL) {
          return { status: 200, url, html: aboutHtml }
        }

        if (url === peerRobotics.WELLFOUND_JOBS_URL) {
          return {
            status: 200,
            url,
            html: '<html><head><title>Peer Robotics Jobs</title></head><body><h1>Open Roles</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /wellfound jobs board/i,
  )
})
