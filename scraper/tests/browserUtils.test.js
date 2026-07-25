import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveBrowserExecutablePath } from '../utils/browser.js'

test('resolveBrowserExecutablePath prefers an explicit Puppeteer executable override when it exists', () => {
  const executablePath = 'C:\\Tools\\Chrome\\chrome.exe'

  assert.equal(
    resolveBrowserExecutablePath({
      platform: 'win32',
      env: {
        PUPPETEER_EXECUTABLE_PATH: executablePath,
      },
      existsSync: (candidate) => candidate === executablePath,
    }),
    executablePath,
  )
})

test('resolveBrowserExecutablePath falls back to a system Chrome install on Windows', () => {
  const systemChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

  assert.equal(
    resolveBrowserExecutablePath({
      platform: 'win32',
      env: {},
      existsSync: (candidate) => candidate === systemChrome,
    }),
    systemChrome,
  )
})

test('resolveBrowserExecutablePath returns null when no supported browser executable is present', () => {
  assert.equal(
    resolveBrowserExecutablePath({
      platform: 'win32',
      env: {},
      existsSync: () => false,
    }),
    null,
  )
})
