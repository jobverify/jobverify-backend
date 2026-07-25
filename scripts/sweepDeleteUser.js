/**
 * @file Administrative database script to completely remove a user and all associated records.
 * @module scripts/sweepDeleteUser
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../.env") });

if (process.env.NODE_ENV === "production") {
  console.error("This script cannot be run in production");
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error("Error: Please provide the email address of the user to delete.");
  console.error("  Usage: node scripts/sweepDeleteUser.js email@example.com");
  process.exit(1);
}

const { default: connectDB } = await import("../db/db.js");
const { default: User } = await import("../src/models/User.js");
const { default: PendingUser } = await import("../src/models/PendingUser.js");
const { default: Subscription } = await import("../src/models/Subscription.js");
const { default: Click } = await import("../src/models/Click.js");

// Connects to the database and executes a cascade delete on the specified email.
const runSweepDelete = async () => {
  await connectDB();

  try {
    console.log(`Starting sweep delete for user: ${email}...`);

    // 1. Delete from PendingUsers (verification limbo)
    const pendingResult = await PendingUser.deleteMany({ email });
    console.log(`- PendingUsers: Deleted ${pendingResult.deletedCount} pending record(s).`);

    // 2. Fetch User from standard Users collection to gather ID
    const user = await User.findOne({ email });
    
    if (user) {
      const userId = user._id;

      // 3. Delete Alert Subscriptions
      const subResult = await Subscription.deleteMany({ user: userId });
      console.log(`- Subscriptions: Deleted ${subResult.deletedCount} job alert subscription(s).`);

      // 4. Delete Job Click History
      const clickResult = await Click.deleteMany({ user: userId });
      console.log(`- Clicks: Deleted ${clickResult.deletedCount} job click record(s).`);

      // 5. Delete User Account
      const userResult = await User.deleteOne({ _id: userId });
      console.log(`- Users: Deleted user account.`);
    } else {
      console.log("- Users: No active account found in the standard Users collection.");
    }

    console.log("✓ Sweep delete completed successfully.");
  } catch (err) {
    console.error("✕ Sweep delete failed:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

await runSweepDelete();
