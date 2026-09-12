import SiteSettings from "../models/SiteSettings.js";

export async function getSiteSettings() {
  const settings = await SiteSettings.findById("global").lean();
  return { billingEnabled: settings?.billingEnabled === true };
}

export async function saveSiteSettings(billingEnabled, updatedBy) {
  const settings = await SiteSettings.findByIdAndUpdate("global", {
    $set: { billingEnabled, updatedBy },
  }, { upsert: true, new: true, runValidators: true }).lean();
  return { billingEnabled: settings.billingEnabled };
}
