import User from '../../src/models/User.js';
import GmailConnection from '../../src/models/GmailConnection.js';
import GmailOAuthState from '../../src/models/GmailOAuthState.js';
import Campaign from '../../src/models/Campaign.js';
import OutreachTask from '../../src/models/OutreachTask.js';
import OutreachThread from '../../src/models/OutreachThread.js';
import OutreachUsage from '../../src/models/OutreachUsage.js';
import TailoredResume from '../../src/models/TailoredResume.js';
import ResumeArtifact from '../../src/models/ResumeArtifact.js';

// Legacy deletion tests isolate their original collections. New collections are
// exercised explicitly in outreachAccountDeletion and the Mongo lifecycle test.
export function mockOutreachDeletion(t) {
  t.mock.method(User, 'updateOne', async () => ({ matchedCount: 1 }));
  t.mock.method(GmailConnection, 'findOneAndUpdate', () => ({ select: async () => null }));
  t.mock.method(Campaign, 'updateMany', async () => ({ modifiedCount: 0 }));
  for (const Model of [GmailConnection, GmailOAuthState, Campaign, OutreachTask, OutreachThread, OutreachUsage, TailoredResume, ResumeArtifact]) {
    t.mock.method(Model, 'deleteMany', async () => ({ deletedCount: 0 }));
  }
}
