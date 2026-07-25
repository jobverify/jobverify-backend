/**
 * @file Controllers for fetching and updating authenticated user profiles.
 * @module controllers/userController
 */

import Job from "../models/Job.js";
import Subscription from "../models/Subscription.js";
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
  canUseWhatsappAlerts,
} from "../utils/accessControl.js";
import { normalizePhoneE164 } from "../services/jobAlertService.js";

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
      data: {
        phoneE164: user.contact?.phoneE164 ?? null,
        whatsappOptInAt: user.contact?.whatsappOptInAt ?? null,
        whatsappOptOutAt: user.contact?.whatsappOptOutAt ?? null,
        enabled: Boolean(user.premium?.whatsappAlertsEnabled),
        canUseWhatsappAlerts: canUseWhatsappAlerts(user),
        accessRole: user.accessRole,
        access: buildAccessSummary(user),
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

export const updateWhatsappAlertSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

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

    if (req.body.enabled === true) {
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

      if (!user.contact.phoneE164) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: "A valid WhatsApp phone number is required.",
        });
      }

      user.contact.whatsappOptInAt = new Date();
      user.premium.whatsappAlertsEnabled = true;
    }

    if (req.body.enabled === false) {
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
      data: {
        phoneE164: user.contact?.phoneE164 ?? null,
        whatsappOptInAt: user.contact?.whatsappOptInAt ?? null,
        whatsappOptOutAt: user.contact?.whatsappOptOutAt ?? null,
        enabled: Boolean(user.premium?.whatsappAlertsEnabled),
        canUseWhatsappAlerts: canUseWhatsappAlerts(user),
        accessRole: user.accessRole,
        access: buildAccessSummary(user),
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
