import assert from 'node:assert/strict';
import test from 'node:test';
import Application from '../src/models/Application.js';
import TailoredResume from '../src/models/TailoredResume.js';
import Job from '../src/models/Job.js';
import Click from '../src/models/Click.js';
import { trackJobClick } from '../src/controllers/jobController.js';

for (const duplicate of [false, true]) {
  test(`Apply persists an unconfirmed application even when analytics ${duplicate ? 'deduplicates' : 'records'} the click`, async t => {
    t.mock.method(TailoredResume, 'exists', async () => ({ _id: 'tailored' }));
    const userId = '507f1f77bcf86cd799439011';
    const job = { _id: '507f1f77bcf86cd799439012', title: 'Engineer', company: 'Example', clickCount: 2, sourceUrl: 'https://example.com/careers/123' };
    const application = { _id: '507f1f77bcf86cd799439013', job: job._id, status: 'opened' };
    t.mock.method(Click, 'findOne', () => ({ lean() { return this; }, exec: async () => duplicate ? {} : null }));
    t.mock.method(Click, 'create', async () => ({}));
    t.mock.method(Job, 'findOneAndUpdate', async () => job);
    t.mock.method(Job, 'findOne', () => ({ select() { return this; }, lean() { return this; }, exec: async () => job, then: resolve => resolve(job) }));
    const write = t.mock.method(Application, 'findOneAndUpdate', async (filter, update) => {
      assert.equal(filter.user, userId);
      assert.equal(filter.job, job._id);
      assert.equal(update.$setOnInsert.status, 'opened');
      return application;
    });
    const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await trackJobClick({ user: { _id: userId }, params: { id: job._id }, headers: {}, ip: '127.0.0.1' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(write.mock.callCount(), 1);
    assert.deepEqual(res.body.data.application, application);
  });
}
