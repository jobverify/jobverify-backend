/**
 * @file Middleware for authentication verification and role-based access control.
 * @module middleware/authMiddleware
 */

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import BlacklistedToken from "../models/BlacklistedToken.js";
import Subscription from "../models/Subscription.js";
import { getRequestAuthToken } from "../utils/authCookies.js";
import { applyExpiredAccessDowngrade } from "../utils/accessControl.js";

if (!process.env.JWT_SECRET) {
  console.error("[Config Error] JWT_SECRET is not defined or cannot be accessed in the .env configuration.");
  throw new Error("JWT_SECRET environment variable is not defined.");
}

// Verifies the Bearer JWT token and requires authorization to proceed.
export const protect = async (req, res, next) => {
  const token = getRequestAuthToken(req);

  if (!token) {
    return res.status(401).json({ msg: "Not authorized, no token" });
  }

  try {
    const isBlacklisted = await BlacklistedToken.findOne({ token });
    if (isBlacklisted) {
      return res
        .status(401)
        .json({ message: "Invalid Token, Please Log in again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ msg: "Invalid Token" });
    }

    if (applyExpiredAccessDowngrade(req.user)) {
      await Subscription.updateOne(
        { user: req.user._id },
        { $set: { isActive: false } },
      ).catch(() => null);
      await req.user.save();
    }

    if (req.user.deactivated) {
      return res.status(403).json({ message: "Your account has been deactivated. Please contact support." });
    }

    next();
  } catch (err) {
    console.log(err.message);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Optionally extracts the authenticated user from JWT without blocking if absent.
export const optionalProtect = async (req, res, next) => {
  const token = getRequestAuthToken(req);

  if (token) {
    try {
      const isBlacklisted = await BlacklistedToken.findOne({ token });
      if (!isBlacklisted) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user && !user.deactivated) {
          if (applyExpiredAccessDowngrade(user)) {
            await Subscription.updateOne(
              { user: user._id },
              { $set: { isActive: false } },
            ).catch(() => null);
            await user.save();
          }
          req.user = user;
        }
      }
    } catch (err) {
      console.log("Optional auth failed:", err.message);
    }
  }
  next();
};

// Restricts route access to specified administrative roles.
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role: ${req.user.role} is not authorized to access this route.`,
      });
    }
    next();
  };
};
