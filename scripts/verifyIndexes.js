/**
 * @file Index verification utility for all Mongoose database models.
 * @module scripts/verifyIndexes
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../.env") });

const { default: connectDB } = await import("../db/db.js");
const { default: Job } = await import("../src/models/Job.js");
const { default: User } = await import("../src/models/User.js");
const { default: Click } = await import("../src/models/Click.js");
const { default: Subscription } = await import("../src/models/Subscription.js");
const { default: AdminAudit } = await import("../src/models/AdminAudit.js");
const { default: BlacklistedToken } = await import("../src/models/BlacklistedToken.js");

// Synchronizes and lists MongoDB indexes for a given model.
async function verifyModelIndexes(name, model) {
  console.log(`\n--- Model: ${name} ---`);
  
  // Synchronize model schema indexes with MongoDB (creates new, drops removed/outdated ones)
  await model.syncIndexes();
  
  const indexes = await model.collection.indexes();
  indexes.forEach((idx) => {
    const fields = Object.keys(idx.key)
      .map((k) => `${k}: ${idx.key[k]}`)
      .join(", ");
    
    const extra = [];
    if (idx.unique) extra.push("unique");
    if (idx.sparse) extra.push("sparse");
    if (idx.partialFilterExpression) {
      extra.push(`partial: ${JSON.stringify(idx.partialFilterExpression)}`);
    }
    
    const suffix = extra.length > 0 ? ` (${extra.join(", ")})` : "";
    console.log(`  [${idx.name}] { ${fields} }${suffix}`);
  });
}

// Entrypoint for running index synchronisation and verification.
async function main() {
  try {
    await connectDB();
    
    await verifyModelIndexes("Job", Job);
    await verifyModelIndexes("User", User);
    await verifyModelIndexes("Click", Click);
    await verifyModelIndexes("Subscription", Subscription);
    await verifyModelIndexes("AdminAudit", AdminAudit);
    await verifyModelIndexes("BlacklistedToken", BlacklistedToken);
    
    console.log("\n✓ All database indexes verified successfully.");
  } catch (err) {
    console.error("Index verification failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
