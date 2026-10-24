import assert from 'node:assert/strict';
import test from 'node:test';
import Application from '../src/models/Application.js';
import TailoredResume from '../src/models/TailoredResume.js';
import { recordApplicationOpen } from '../src/services/applicationService.js';

test('opening an employer page tracks intent without requiring a generated resume', async t => {
  t.mock.method(TailoredResume, 'exists', async () => null);
  t.mock.method(Application, 'findOneAndUpdate', async (_filter, update) => ({
    _id: '507f1f77bcf86cd799439013', ...update.$setOnInsert,
  }));
  const application = await recordApplicationOpen('507f1f77bcf86cd799439011', {
    _id: '507f1f77bcf86cd799439012', title: 'Engineer', company: 'Example', sourceUrl: 'https://example.com/jobs/42',
  });
  assert.ok(application, 'Candidates using their own CV must have a tracked application');
  assert.equal(application.status, 'opened');
  assert.equal(application.appliedAt, undefined, 'Opening a link is not submission evidence');
});
