import assert from 'node:assert/strict'
import test from 'node:test'

import { finalizeDirectRunnerExit } from '../runner.js'

test('finalizeDirectRunnerExit forces a clean zero exit when no failure was recorded', () => {
  let capturedCode = null

  finalizeDirectRunnerExit({
    processRef: { exitCode: undefined },
    exit: (code) => {
      capturedCode = code
    },
  })

  assert.equal(capturedCode, 0)
})

test('finalizeDirectRunnerExit preserves a non-zero exit code', () => {
  let capturedCode = null

  finalizeDirectRunnerExit({
    processRef: { exitCode: 1 },
    exit: (code) => {
      capturedCode = code
    },
  })

  assert.equal(capturedCode, 1)
})
