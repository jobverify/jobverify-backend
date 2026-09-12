import { getSiteSettings, saveSiteSettings } from "../services/siteSettingsService.js";

export async function readSiteSettings(_req, res, next) {
  try {
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: await getSiteSettings() });
  } catch (error) { next(error); }
}

export async function updateSiteSettings(req, res, next) {
  if (typeof req.body?.billingEnabled !== "boolean") {
    return res.status(400).json({ success: false, message: "billingEnabled must be a boolean." });
  }
  try {
    const data = await saveSiteSettings(req.body.billingEnabled, req.user._id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}
