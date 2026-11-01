import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteQueueQuery } from '../rewriting/runner.js';

test('a 32-runner queue covers every ObjectId suffix exactly once', () => {
  assert.doesNotThrow(() => rewriteQueueQuery(new Date(), { shard: 0, shardCount: 32 }));
  for (const shardCount of [2, 4, 8, 16, 32, 64, 128, 256]) {
    const patterns = Array.from({ length: shardCount }, (_, shard) =>
      new RegExp(rewriteQueueQuery(new Date(), { shard, shardCount }).$expr.$regexMatch.regex));
    for (let suffix = 0; suffix < 256; suffix++) {
      const id = '6adfc3e3391d35a35290d8' + suffix.toString(16).padStart(2, '0');
      assert.deepEqual(patterns.flatMap((pattern, shard) => pattern.test(id) ? [shard] : []), [suffix % shardCount]);
    }
  }
});

test('unsupported partition counts fail before reading the database', () => {
  for (const shardCount of [3, 17, 257, 0, NaN]) {
    assert.throws(() => rewriteQueueQuery(new Date(), { shard: 0, shardCount }), /shard|partition/i);
  }
});

test('the observed queue gets a full dynamic matrix rather than four fixed workers', async () => {
  const { buildRewritePlan } = await import('../rewriting/partitioning.js').catch(() => ({}));
  assert.equal(typeof buildRewritePlan, 'function');
  const plan = buildRewritePlan(27660);
  assert.equal(plan.shardCount, 32);
  assert.equal(plan.maxParallel, 8);
  assert.equal(plan.estimatedJobsPerShard, 865);
  assert.deepEqual(plan.matrix.shard, Array.from({ length: 32 }, (_, index) => index));
  assert.equal(buildRewritePlan(0).shardCount, 1);
  assert.equal(buildRewritePlan(1000).shardCount, 1);
  assert.equal(buildRewritePlan(1001).shardCount, 2);
  assert.equal(buildRewritePlan(1000000).shardCount, 256);
  assert.equal(buildRewritePlan(1000000).capacityLimited, true);
  for (const queued of [-1, 1.5, NaN, Infinity]) assert.throws(() => buildRewritePlan(queued), /queue/i);
  assert.throws(() => buildRewritePlan(10, { jobsPerShard: 0 }), /partition/i);
  assert.throws(() => buildRewritePlan(10, { maxParallel: 0 }), /parallel/i);
});
