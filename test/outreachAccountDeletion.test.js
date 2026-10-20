import assert from 'node:assert/strict';
import test from 'node:test';
import { removeUserAccount } from '../src/services/userAccountDeletion.js';
import User from '../src/models/User.js';
import GmailConnection from '../src/models/GmailConnection.js';
import GmailOAuthState from '../src/models/GmailOAuthState.js';
import Campaign from '../src/models/Campaign.js';
import OutreachThread from '../src/models/OutreachThread.js';
import OutreachTask from '../src/models/OutreachTask.js';
import OutreachUsage from '../src/models/OutreachUsage.js';
import Subscription from '../src/models/Subscription.js';
import Click from '../src/models/Click.js';
import JobAlertDelivery from '../src/models/JobAlertDelivery.js';
import PlanPurchase from '../src/models/PlanPurchase.js';
import AccessEvent from '../src/models/AccessEvent.js';
import TelegramLinkToken from '../src/models/TelegramLinkToken.js';
import UserSuggestion from '../src/models/UserSuggestion.js';
import Application from '../src/models/Application.js';
import Resume from '../src/models/Resume.js';
import TailoredResume from '../src/models/TailoredResume.js';
import PendingUser from '../src/models/PendingUser.js';
import AdminAudit from '../src/models/AdminAudit.js';
import SiteSettings from '../src/models/SiteSettings.js';

test('account deletion blocks new outreach before revoking and removing all private records', async t => {
  const user = { _id: '507f1f77bcf86cd799439011', email: 'delete@gmail.com' };
  const calls = [];
  t.mock.method(User, 'updateOne', async (filter, update) => { calls.push(['mark', filter, update]); return { matchedCount: 1 }; });
  t.mock.method(User, 'deleteOne', async filter => { calls.push(['User', filter]); });
  t.mock.method(GmailConnection, 'findOneAndUpdate', filter => ({ select: async () => { calls.push(['disconnect', filter]); return null; } }));
  t.mock.method(Campaign, 'updateMany', async () => {});
  t.mock.method(SiteSettings, 'updateMany', async () => {});
  for (const Model of [Subscription, Click, JobAlertDelivery, PlanPurchase, AccessEvent, TelegramLinkToken, UserSuggestion, Application,
    PendingUser, AdminAudit, GmailConnection, GmailOAuthState, Campaign, OutreachThread, OutreachTask, OutreachUsage, Resume, TailoredResume]) {
    t.mock.method(Model, 'deleteMany', async filter => { calls.push([Model.modelName, filter]); });
  }
  await removeUserAccount(user);
  assert.equal(calls[0][0], 'mark');
  assert.ok(calls[0][2].$set.outreachDeletingAt instanceof Date);
  assert.ok(calls.findIndex(([name]) => name === 'disconnect') < calls.findIndex(([name]) => name === 'OutreachThread'));
  for (const name of ['GmailConnection', 'GmailOAuthState', 'Campaign', 'OutreachThread', 'OutreachTask', 'OutreachUsage', 'Resume', 'TailoredResume']) {
    assert.ok(calls.some(([model, filter]) => model === name && filter.user === user._id), name);
  }
  assert.deepEqual(calls.at(-1), ['User', { _id: user._id }]);
});
