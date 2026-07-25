import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'

import connectDB from '../db/db.js'

test('connectDB rethrows connection errors instead of exiting the process', async () => {
  const originalConnect = mongoose.connect
  const originalExit = process.exit
  const exitCalls = []

  mongoose.connect = async () => {
    throw new Error('atlas unavailable')
  }

  process.exit = (code) => {
    exitCalls.push(code)
  }

  try {
    await assert.rejects(connectDB(), /atlas unavailable/)
    assert.deepEqual(exitCalls, [])
  } finally {
    mongoose.connect = originalConnect
    process.exit = originalExit
  }
})
