import test from 'node:test';
import assert from 'node:assert/strict';
import { safeResumeDiagnostic, resumeFailure } from '../outreach/resumeDiagnostics.js';

test('diagnostics permit fixed codes, stages and bounded numbers only', () => {
  const event = safeResumeDiagnostic({ stage: 'compiling', code: 'compiler_dependency_missing', attempt: 2, seconds: 3.5,
    message: 'private resume', latex: '\\documentclass', email: 'private@example.test', issueCount: 4 });
  assert.deepEqual(event, { stage: 'compiling', code: 'compiler_dependency_missing', attempt: 2, seconds: 3.5, issueCount: 4 });
  const untrusted = safeResumeDiagnostic({ stage: 'private resume', code: 'private@example.test', attempt: 'private', seconds: Infinity });
  assert.deepEqual(untrusted, { stage: 'worker', code: 'processing_failed' });
  assert.doesNotMatch(JSON.stringify(resumeFailure('private@example.test')), /private/);
});
