/**
 * @file Controllers for fetching and updating authenticated user profiles.
 * @module controllers/userController
 */

import Job from "../models/Job.js";
import Subscription from "../models/Subscription.js";
import TelegramLinkToken from "../models/TelegramLinkToken.js";
import User from "../models/User.js";
import { normalizePreferredJobType } from "../constants/preferredJobTypes.js";
import { ACCESS_ROLES } from "../constants/accessPlans.js";
import {
  deriveLegacyProfilePreferences,
  normalizeProfilePreferenceFilters,
} from "../utils/profilePreferenceFilters.js";
import {
  applyExpiredAccessDowngrade,
  buildAccessSummary,
  canUseTelegramAlerts,
  canUseWhatsappAlerts,
} from "../utils/accessControl.js";
import { normalizePhoneE164 } from "../utils/phoneNumbers.js";
import { buildPublishedJobDateScope } from "../utils/publicJobLocationScope.js";
import { createTelegramLinkToken } from "../services/telegramLinkService.js";

const MAX_PROFILE_TEXT_LENGTH = 80;
const MAX_PROFILE_ITEMS = 20;

const normalizeProfileText = (value) =>
  String(value ?? "").trim().slice(0, MAX_PROFILE_TEXT_LENGTH);

const normalizeProfileList = (value) => {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(
    list
      .map((item) => normalizeProfileText(item))
      .filter(Boolean),
  )].slice(0, MAX_PROFILE_ITEMS);
};

const normalizePreferredJobTypes = (value) => {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(
    list
      .map((item) => normalizePreferredJobType(item))
      .filter(Boolean),
  )].slice(0, MAX_PROFILE_ITEMS);
};

const normalizePassingYear = (value) => {
  const year = Number(value);
  return Number.isInteger(year) ? year : undefined;
};

const getSavedJobIds = (user) => (user.savedJobs ?? []).map((jobId) => String(jobId));

const buildSavedJobsFilter = (savedJobIds) => ({
  _id: { $in: savedJobIds },
  status: { $ne: "hidden" },
  ...buildPublishedJobDateScope(),
});

const countAvailableSavedJobs = async (user) => {
  const savedJobIds = getSavedJobIds(user);

  if (savedJobIds.length === 0) {
    return 0;
  }

  return Job.countDocuments(buildSavedJobsFilter(savedJobIds));
};

const buildProfileOverview = (user, savedJobsCount = user.savedJobs?.length ?? 0) => ({
  savedJobs: savedJobsCount,
});

const WHATSAPP_ELIGIBLE_ACCESS_ROLES = new Set([
  ACCESS_ROLES.SEMESTER,
  ACCESS_ROLES.YEARLY,
]);

const TELEGRAM_ELIGIBLE_ACCESS_ROLES = new Set([
  ACCESS_ROLES.SEMESTER,
  ACCESS_ROLES.YEARLY,
]);

const revokeUnusedTelegramLinks = (userId, now = new Date()) =>
  TelegramLinkToken.updateMany(
    { user: userId, consumedAt: null },
    { $set: { consumedAt: now } },
  );

const issueTelegramLinkToken = async (userId) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const now = new Date();
    await revokeUnusedTelegramLinks(userId, now);

    try {
      return await createTelegramLinkToken(userId, now);
    } catch (error) {
      if (error?.code !== 11000 || attempt === maxAttempts) throw error;
    }
  }

  throw new Error("Unable to issue a Telegram link token.");
};

const hasTelegramEligibility = (user) =>
  user.role === "admin"
  || (
    TELEGRAM_ELIGIBLE_ACCESS_ROLES.has(user.accessRole)
    && user.premium?.status === "active"
  );

const hasLinkedTelegram = (user) => {
  const linkedAt = user.telegram?.linkedAt;
  const optedOutAt = user.telegram?.optedOutAt;

  return Boolean(
    user.telegram?.chatId
    && linkedAt
    && (
      !optedOutAt
      || new Date(linkedAt).getTime() > new Date(optedOutAt).getTime()
    ),
  );
};

const persistExpiredAccessDowngrade = async (user) => {
  if (!applyExpiredAccessDowngrade(user)) return false;

  await Subscription.updateOne(
    { user: user._id },
    { $set: { isActive: false } },
  ).catch(() => null);
  await user.save();
  return true;
};

const buildWhatsappAlertSettingsData = (user) => ({
  phoneE164: user.contact?.phoneE164 ?? null,
  whatsappOptInAt: user.contact?.whatsappOptInAt ?? null,
  whatsappOptOutAt: user.contact?.whatsappOptOutAt ?? null,
  enabled: Boolean(user.premium?.whatsappAlertsEnabled),
  canUseWhatsappAlerts: canUseWhatsappAlerts(user),
  accessRole: user.accessRole,
  access: buildAccessSummary(user),
  whatsappAlertFilters: normalizeProfilePreferenceFilters(user.profile?.whatsappAlertFilters),
});

const buildTelegramAlertSettingsData = (user) => ({
  linked: hasLinkedTelegram(user),
  username: user.telegram?.username ?? null,
  linkedAt: user.telegram?.linkedAt ?? null,
  optedOutAt: user.telegram?.optedOutAt ?? null,
  enabled: Boolean(user.premium?.telegramAlertsEnabled),
  canUseTelegramAlerts: canUseTelegramAlerts(user),
  accessRole: user.accessRole,
  access: buildAccessSummary(user),
  telegramAlertFilters: normalizeProfilePreferenceFilters(
    user.profile?.telegramAlertFilters,
  ),
});

const buildProfilePayload = (user, savedJobsCount) => ({
  code: 200,
  success: true,
  message: "User profile retrieved successfully",
  id: user._id,
  email: user.email,
  role: user.role,
  accessRole: user.accessRole,
  access: buildAccessSummary(user),
  profile: user.profile,
  contact: user.contact,
  profileOverview: buildProfileOverview(user, savedJobsCount),
  onboardingCompleted: user.onboardingCompleted,
  lastLoginAt: user.lastLoginAt,
});

// Retrieves the profile details of the authenticated user.
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (applyExpiredAccessDowngrade(user)) {
        await Subscription.updateOne(
          { user: user._id },
          { $set: { isActive: false } },
        ).catch(() => null);
        await user.save();
      }

      const savedJobsCount = await countAvailableSavedJobs(user);

      res.status(200).json(buildProfilePayload(user, savedJobsCount));
    } else {
      res.status(404).json({
        code: 404,
        success: false,
        message: "User not found"
      });
    }
  } catch (error) {
    res.status(500).json({
      code: 500,
      success: false,
      message: error.message
    });
  }
};

// Updates individual profile fields and automatically tracks onboarding completion.
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Update profile fields if provided
      if (req.body.name !== undefined) user.profile.name = normalizeProfileText(req.body.name);
      if (req.body.branch !== undefined) user.profile.branch = normalizeProfileText(req.body.branch);
      if (req.body.passingYear !== undefined) {
        const passingYear = normalizePassingYear(req.body.passingYear);
        if (passingYear !== undefined) user.profile.passingYear = passingYear;
      }
      if (req.body.preferredJobTypes !== undefined) {
        user.profile.preferredJobTypes = normalizePreferredJobTypes(req.body.preferredJobTypes);
      }
      if (req.body.locationPreference !== undefined) {
        user.profile.locationPreference = normalizeProfileList(req.body.locationPreference);
      }
      if (req.body.profilePreferenceFilters !== undefined) {
        const normalizedFilters = normalizeProfilePreferenceFilters(req.body.profilePreferenceFilters);
        const compatibility = deriveLegacyProfilePreferences(normalizedFilters);

        user.profile.profilePreferenceFilters = normalizedFilters;
        user.profile.locationPreference = compatibility.locationPreference;
        user.profile.preferredJobTypes = compatibility.preferredJobTypes;
      }

      // Ensure profile defaults are maintained if object properties are missing
      // user.profile is a nested schema, so modification tracking handles subdoc changes.
      user.onboardingCompleted = Boolean(
        user.profile.branch &&
        user.profile.passingYear &&
        user.profile.preferredJobTypes?.length > 0 &&
        user.profile.locationPreference?.length > 0
      );
      if (applyExpiredAccessDowngrade(user)) {
        await Subscription.updateOne(
          { user: user._id },
          { $set: { isActive: false } },
        ).catch(() => null);
      }
      const updatedUser = await user.save();
      const savedJobsCount = await countAvailableSavedJobs(updatedUser);

      res.status(200).json({
        ...buildProfilePayload(updatedUser, savedJobsCount),
        message: "User profile updated successfully",
      });
    } else {
      res.status(404).json({
        code: 404,
        success: false,
        message: "User not found"
      });
    }
  } catch (error) {
    res.status(500).json({
      code: 500,
      success: false,
      message: error.message
    });
  }
};

export const getSavedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedJobs");

    if (!user) {
      res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
      return;
    }

    const savedJobIds = getSavedJobIds(user);

    if (savedJobIds.length === 0) {
      res.status(200).json({
        code: 200,
        success: true,
        message: "Saved jobs retrieved successfully",
        data: [],
        profileOverview: buildProfileOverview(user, 0),
      });
      return;
    }

    const jobs = await Job.find(buildSavedJobsFilter(savedJobIds));

    const jobsById = new Map(jobs.map((job) => [String(job._id), job]));
    const availableSavedJobIds = savedJobIds.filter((jobId) => jobsById.has(jobId));

    if (availableSavedJobIds.length !== savedJobIds.length) {
      user.savedJobs = availableSavedJobIds;
      await user.save();
    }

    const orderedJobs = [...availableSavedJobIds]
      .reverse()
      .map((jobId) => jobsById.get(jobId))
      .filter(Boolean);

    res.status(200).json({
      code: 200,
      success: true,
      message: "Saved jobs retrieved successfully",
      data: orderedJobs,
      profileOverview: buildProfileOverview(user, availableSavedJobIds.length),
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};

export const saveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const [user, job] = await Promise.all([
      User.findById(req.user._id),
      Job.findById(jobId),
    ]);

    if (!user) {
      res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
      return;
    }

    if (!job) {
      res.status(404).json({
        code: 404,
        success: false,
        message: "Job not found",
      });
      return;
    }

    const hasSavedJob = (user.savedJobs ?? []).some(
      (savedJobId) => String(savedJobId) === jobId,
    );

    if (!hasSavedJob) {
      user.savedJobs.push(job._id);
      await user.save();
    }

    const savedJobsCount = await countAvailableSavedJobs(user);

    res.status(200).json({
      code: 200,
      success: true,
      message: hasSavedJob ? "Job already saved" : "Job saved successfully",
      saved: true,
      jobId,
      profileOverview: buildProfileOverview(user, savedJobsCount),
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};

export const removeSavedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
      return;
    }

    const nextSavedJobs = (user.savedJobs ?? []).filter(
      (savedJobId) => String(savedJobId) !== jobId,
    );

    if (nextSavedJobs.length !== user.savedJobs.length) {
      user.savedJobs = nextSavedJobs;
      await user.save();
    }

    const savedJobsCount = await countAvailableSavedJobs(user);

    res.status(200).json({
      code: 200,
      success: true,
      message: "Saved job removed successfully",
      saved: false,
      jobId,
      profileOverview: buildProfileOverview(user, savedJobsCount),
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};

export const getWhatsappAlertSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
    }

    if (applyExpiredAccessDowngrade(user)) {
      await Subscription.updateOne(
        { user: user._id },
        { $set: { isActive: false } },
      ).catch(() => null);
      await user.save();
    }

    return res.status(200).json({
      code: 200,
      success: true,
      data: buildWhatsappAlertSettingsData(user),
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};

export const updateWhatsappAlertSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const enabled = [true, "true", "1"].includes(req.body.enabled)
      ? true
      : [false, "false", "0"].includes(req.body.enabled)
        ? false
        : undefined;

    if (!user) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
    }

    if (req.body.phoneE164 !== undefined) {
      user.contact.phoneE164 = normalizePhoneE164(req.body.phoneE164);
    }

    if (req.body.whatsappAlertFilters !== undefined) {
      user.profile.whatsappAlertFilters = normalizeProfilePreferenceFilters(
        req.body.whatsappAlertFilters,
      );
    }

    if (enabled === true) {
      if (
        user.role !== "admin"
        && !WHATSAPP_ELIGIBLE_ACCESS_ROLES.has(user.accessRole)
      ) {
        return res.status(403).json({
          code: 403,
          success: false,
          message: "WhatsApp alerts require an active semester or yearly plan.",
        });
      }

      const normalizedWhatsappPhone = normalizePhoneE164(user.contact?.phoneE164);
      if (!normalizedWhatsappPhone) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: "A valid WhatsApp phone number is required.",
        });
      }

      user.contact.phoneE164 = normalizedWhatsappPhone;
      user.contact.whatsappOptInAt = new Date();
      user.premium.whatsappAlertsEnabled = true;
    }

    if (enabled === false) {
      user.contact.whatsappOptOutAt = new Date();
      user.premium.whatsappAlertsEnabled = false;
    }

    if (applyExpiredAccessDowngrade(user)) {
      await Subscription.updateOne(
        { user: user._id },
        { $set: { isActive: false } },
      ).catch(() => null);
    }
    await user.save();

    return res.status(200).json({
      code: 200,
      success: true,
      message: "WhatsApp alert settings updated successfully.",
      data: buildWhatsappAlertSettingsData(user),
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};

export const createTelegramAlertLink = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
    }

    await persistExpiredAccessDowngrade(user);

    if (!hasTelegramEligibility(user)) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: "Telegram alerts require an active semester or yearly plan.",
      });
    }

    const botUsername = String(process.env.TELEGRAM_BOT_USERNAME || "")
      .trim()
      .replace(/^@/u, "");
    if (!botUsername) {
      return res.status(503).json({
        code: 503,
        success: false,
        message: "Telegram linking is not configured.",
      });
    }

    const { rawToken } = await issueTelegramLinkToken(user._id);

    return res.status(200).json({
      data: {
        deepLink: `https://t.me/${botUsername}?start=${rawToken}`,
      },
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};

export const getTelegramAlertSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
    }

    await persistExpiredAccessDowngrade(user);

    return res.status(200).json({
      code: 200,
      success: true,
      data: buildTelegramAlertSettingsData(user),
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};

export const updateTelegramAlertSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
    }

    await persistExpiredAccessDowngrade(user);

    if (req.body.enabled === true && !hasLinkedTelegram(user)) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Link a Telegram account before enabling alerts.",
      });
    }

    if (req.body.enabled === true && !hasTelegramEligibility(user)) {
      return res.status(403).json({
        code: 403,
        success: false,
        message: "Telegram alerts require an active semester or yearly plan.",
      });
    }

    if (req.body.telegramAlertFilters !== undefined) {
      user.profile.telegramAlertFilters = normalizeProfilePreferenceFilters(
        req.body.telegramAlertFilters,
      );
    }

    if (req.body.enabled !== undefined) {
      user.premium.telegramAlertsEnabled = req.body.enabled === true;
    }

    await user.save();

    return res.status(200).json({
      code: 200,
      success: true,
      message: "Telegram alert settings updated successfully.",
      data: buildTelegramAlertSettingsData(user),
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};

export const deleteTelegramAlertSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        code: 404,
        success: false,
        message: "User not found",
      });
    }

    user.telegram.chatId = null;
    user.telegram.username = null;
    user.telegram.linkedAt = null;
    user.telegram.optedOutAt = new Date();
    user.premium.telegramAlertsEnabled = false;
    await user.save();
    await revokeUnusedTelegramLinks(user._id, user.telegram.optedOutAt);

    return res.status(200).json({
      code: 200,
      success: true,
      message: "Telegram account unlinked successfully.",
      data: buildTelegramAlertSettingsData(user),
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      success: false,
      message: error.message,
    });
  }
};
