import OutreachUsage from '../models/OutreachUsage.js';
export const outreachError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
export const monthKey = (date = new Date()) => date.toISOString().slice(0, 7);
/** Never refund ambiguous calls: reserving before provider I/O bounds worst-case charges. */
export async function reserveUsage(key, limit, { units = 1, user = null, now = new Date() } = {}) {
  if (!Number.isInteger(limit) || limit < units) throw outreachError('The outreach allowance is exhausted. Try again after it resets.', 429);
  try {
    await OutreachUsage.updateOne({ key }, { $setOnInsert: { used: 0, user, expiresAt: new Date(now.getTime() + 65 * 86400000) } }, { upsert: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  const result = await OutreachUsage.findOneAndUpdate({ key, used: { $lte: limit - units } }, { $inc: { used: units } }, { new: true });
  if (!result) throw outreachError('The outreach allowance is exhausted. Try again after it resets.', 429);
  return result;
}

/** Track workflow dispatches without imposing an application monthly allowance. */
export async function recordUsage(key, { now = new Date() } = {}) {
  try {
    return await OutreachUsage.findOneAndUpdate({ key }, {
      $inc: { used: 1 },
      $setOnInsert: { user: null, expiresAt: new Date(now.getTime() + 65 * 86400000) },
    }, { upsert: true, new: true, setDefaultsOnInsert: false });
  } catch (error) {
    if (error.code !== 11000) throw error;
    // Another backend may have created this month's counter concurrently.
    return OutreachUsage.findOneAndUpdate({ key }, { $inc: { used: 1 } }, { new: true });
  }
}
