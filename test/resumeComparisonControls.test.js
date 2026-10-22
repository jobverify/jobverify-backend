import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyResumeComparison } from '../scripts/verifyResumeComparison.js';

const answer = (supported, unsupportedClaims = []) => JSON.stringify({ evidence: 'Compared the original and generated factual claims.', missingFacts: [], unsupportedClaims, supported });

test('rollout controls require accepting supported formatting and rejecting an invented achievement', async () => {
  let calls = 0;
  const result = await verifyResumeComparison({ generate: async () => ++calls === 1 ? answer(true) : answer(false, ['Invented leadership achievement.']) });
  assert.equal(result.comparisonControls, 2);
  assert.equal(result.supportedFormattingAccepted, true);
  assert.equal(result.unsupportedLeadershipRejected, true);
});

test('an auditor that always accepts, always rejects, or omits evidence fails rollout', async () => {
  for (const output of [answer(true), answer(false, ['Unfounded discrepancy.']), JSON.stringify({ supported: true, missingFacts: [], unsupportedClaims: [] })]) {
    await assert.rejects(verifyResumeComparison({ generate: async () => output }), error => error.code === 'factual_validation_failed');
  }
});
