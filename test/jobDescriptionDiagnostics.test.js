import test from 'node:test';
import assert from 'node:assert/strict';
import { createRewriteDiagnostics } from '../rewriting/diagnostics.js';

test('rejection diagnostics retain useful source/output context with strict count and byte limits', () => {
  const diagnostics = createRewriteDiagnostics({ maxSamples: 2, maxBytes: 12000 });
  for (let i = 0; i < 6; i++) diagnostics.record({ id: 'job-' + i, reason: 'unsupported_claim',
    input: { inputHash: 'a'.repeat(64), sourceDescription: 'Source description. '.repeat(1000) },
    response: { rawValue: { sections: [{ text: 'Generated description. '.repeat(1000) }] } },
    diagnostic: { section: 'overview', itemIndex: 0, text: 'Unstated Kubernetes skill.', evidence: 'Python services.' } });
  const snapshot = diagnostics.snapshot();
  assert.equal(snapshot.totalRejected, 6); assert.equal(snapshot.reasons.unsupported_claim, 6);
  assert.equal(snapshot.samples.length, 2); assert.ok(Buffer.byteLength(JSON.stringify(snapshot)) <= 12000);
  assert.equal(snapshot.samples[0].validation.text, 'Unstated Kubernetes skill.');
  assert.match(snapshot.samples[0].sourceContext, /Python services/);
});

test('diagnostics omit exception messages, configuration and unrelated model fields', () => {
  const diagnostics = createRewriteDiagnostics();
  diagnostics.record({ id: 'job', reason: 'timeout', error: new Error('mongodb://user:password@private'),
    MONGO_URI: 'private database', input: { inputHash: 'hash', sourceDescription: 'Public employer wording.' },
    response: { value: { sections: [] }, headers: { Authorization: 'Bearer secret' } } });
  const text = JSON.stringify(diagnostics.snapshot());
  assert.doesNotMatch(text, /mongodb|password|MONGO_URI|Authorization|Bearer/);
  assert.match(text, /Public employer wording/);
});
