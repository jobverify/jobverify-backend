export const MAX_REWRITE_SHARDS = 256;

export function validateRewriteShard(shard, shardCount) {
  if (!Number.isSafeInteger(shardCount) || shardCount < 1 || shardCount > MAX_REWRITE_SHARDS
    || (shardCount & (shardCount - 1)) !== 0
    || !Number.isSafeInteger(shard) || shard < 0 || shard >= shardCount) throw new Error('Invalid rewrite shard');
}

/** A suffix is immutable across source changes and has exactly one owner. */
export function rewriteShardFilter(shard, shardCount) {
  validateRewriteShard(shard, shardCount);
  if (shardCount === 1) return {};
  const values = Array.from({ length: shardCount <= 16 ? 16 : 256 }, (_, index) => index)
    .filter(index => index % shardCount === shard);
  const regex = shardCount <= 16 ? `[${values.map(value => value.toString(16)).join('')}]$`
    : `(?:${values.map(value => value.toString(16).padStart(2, '0')).join('|')})$`;
  return { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex } } };
}

/** Plan all partitions in one workflow; GitHub queues them behind maxParallel. */
export function buildRewritePlan(queued, { jobsPerShard = 1000, maxParallel = 8 } = {}) {
  if (!Number.isSafeInteger(queued) || queued < 0) throw new Error('Invalid rewrite queue count');
  if (!Number.isSafeInteger(jobsPerShard) || jobsPerShard < 1) throw new Error('Invalid rewrite partition target');
  if (!Number.isSafeInteger(maxParallel) || maxParallel < 1 || maxParallel > 16) throw new Error('Invalid rewrite parallel runner limit');
  const needed = Math.max(1, Math.ceil(queued / jobsPerShard));
  let shardCount = 1;
  while (shardCount < needed && shardCount < MAX_REWRITE_SHARDS) shardCount *= 2;
  return { queued, jobsPerShard, shardCount, maxParallel: Math.min(maxParallel, shardCount),
    estimatedJobsPerShard: Math.ceil(queued / shardCount), capacityLimited: needed > MAX_REWRITE_SHARDS,
    matrix: { shard: Array.from({ length: shardCount }, (_, index) => index) } };
}
