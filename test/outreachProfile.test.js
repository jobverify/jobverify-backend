import assert from 'node:assert/strict';
import test from 'node:test';
import { validationResult } from 'express-validator';
import User from '../src/models/User.js';
import { updateUserProfile } from '../src/controllers/userController.js';
import { userProfileValidation } from '../src/validation/requestValidators.js';

async function validate(body) {
  const req = { body };
  for (const rule of userProfileValidation) await rule.run(req);
  return validationResult(req).array();
}

test('outreach profile persists long candidate context independently of short profile fields', async t => {
  const user = new User({ email: 'writer@gmail.com', profile: { name: 'Candidate' } });
  t.mock.method(User, 'findById', async () => user);
  user.save = async () => user;
  const aboutYou = 'Built accessible React interfaces. '.repeat(12).trim();
  const req = { user: { _id: user._id }, body: {
    aboutYou: `  ${aboutYou}  `,
    experienceProjects: '  Portfolio project: inventory dashboard.  ',
    portfolioUrl: '  https://example.com/work  ',
  }, siteSettings: {} };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await updateUserProfile(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.profile.aboutYou, aboutYou);
  assert.equal(res.body.profile.experienceProjects, 'Portfolio project: inventory dashboard.');
  assert.equal(res.body.profile.portfolioUrl, 'https://example.com/work');
  assert.equal(res.body.profile.name, 'Candidate');
  assert.equal(user.onboardingCompleted, false);
});

test('outreach profile rejects non-text context, oversized fields and unsafe portfolio links', async () => {
  for (const body of [{ aboutYou: {} }, { aboutYou: 'x'.repeat(4001) }, { experienceProjects: 'x'.repeat(4001) },
    { portfolioUrl: 'javascript:alert(1)' }, { portfolioUrl: 'https://user:password@example.com' }]) {
    assert.ok((await validate(body)).length > 0, JSON.stringify(body).slice(0,100));
  }
  assert.deepEqual(await validate({ aboutYou: '', experienceProjects: 'A real project', portfolioUrl: '' }), []);
  assert.deepEqual(await validate({ portfolioUrl: 'https://example.com/work' }), []);
});

test('candidate summary fields survive Mongoose serialization and can be cleared', () => {
  const user = new User({ email: 'writer@gmail.com', profile: { aboutYou: 'Designer', experienceProjects: 'Built a dashboard', portfolioUrl: 'https://example.com' } });
  assert.equal(user.toJSON().profile.aboutYou, 'Designer');
  user.profile.aboutYou = '';
  user.profile.experienceProjects = '';
  user.profile.portfolioUrl = '';
  assert.equal(user.validateSync(), undefined);
  assert.equal(user.toJSON().profile.aboutYou, '');
});
