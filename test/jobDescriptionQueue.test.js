import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteQueueQuery, rewriteDeadline } from '../rewriting/runner.js';

test('queue includes only pending work and due retries, never baseline, skipped or published jobs', () => {
  const now = new Date('2026-10-02T10:00:00Z');
  const query = rewriteQueueQuery(now);
  assert.equal(query.status, 'active');
  assert.deepEqual(query['descriptionRewrite.attempts'], { $lt: 3 });
  assert.deepEqual(query.$or, [{ 'descriptionRewrite.status': 'pending' }, { 'descriptionRewrite.status': 'failed', 'descriptionRewrite.nextAttemptAt': { $lte: now } }]);
});

test('malformed workflow timestamps and limits fail closed', () => {
  assert.throws(() => rewriteDeadline({ workflowStartedAt: 'bad' }), /timestamp/);
  assert.throws(() => rewriteDeadline({ workflowSeconds: 'bad' }), /deadline/);
});
