import assert from 'node:assert/strict';
import test from 'node:test';

test('outreach, campaigns and Gmail stay private and use existing CSRF protections', async t => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'outreach-http-test-secret-at-least-32-characters';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  const { createApp } = await import('../src/app.js');
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/api/user/outreach/threads', '/api/user/outreach/tasks/507f1f77bcf86cd799439011', '/api/user/gmail', '/api/user/campaigns']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 401, `${route} requires authentication`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  for (const route of ['/api/user/outreach/discoveries', '/api/user/gmail/connect', '/api/user/campaigns']) {
    const response = await fetch(base + route, { method: 'POST', headers: { Origin: process.env.CORS_ORIGIN, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 403, `${route} requires CSRF`);
  }
});
