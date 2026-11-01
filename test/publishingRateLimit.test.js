import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import * as rateLimits from '../src/utils/rateLimit.js';

test('publishing pagination has a separate quota from interactive search', () => {
  assert.equal(rateLimits.getApiRateLimitProfile({ method: 'GET', originalUrl: '/api/publishing/build-feed?limit=200' }), 'publishing');
  assert.equal(rateLimits.getApiRateLimitProfile({ method: 'GET', originalUrl: '/api/jobs' }), 'expensive-search');
});

test('publishing permits a full 500-page build while retaining a finite per-IP limit', async () => {
  assert.equal(typeof rateLimits.createPublishingRateLimiter, 'function');
  const app = express();
  app.use(rateLimits.createPublishingRateLimiter({ NODE_ENV: 'production' }));
  app.get('/api/publishing/build-feed', (_req, res) => res.json({ success: true }));
  app.get('/api/jobs', (_req, res) => res.json({ success: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (let i = 0; i < 600; i += 1) {
      const response = await fetch(`${base}/api/publishing/build-feed?limit=200`);
      assert.equal(response.status, 200, `page ${i + 1}`);
      await response.text();
    }
    const blocked = await fetch(`${base}/api/publishing/build-feed`);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
    assert.equal((await blocked.json()).error, 'rate_limited');
    const search = await fetch(`${base}/api/jobs`);
    assert.equal(search.status, 200);
    await search.text();
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
