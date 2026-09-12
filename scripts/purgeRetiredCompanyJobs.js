/**
 * Remove job records created for retired company providers.
 *
 * Usage:
 *   node scripts/purgeRetiredCompanyJobs.js
 *   node scripts/purgeRetiredCompanyJobs.js --confirm
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../.env") });

const retiredSources = [
  "1mg", "dishtv", "dpworld", "cars24", "ashokleyland", "ador",
  "fortishealthcare", "adityabirlacapital", "legrand", "tatamotors",
  "godrejconsumerproducts", "godrejenterprisesgroup", "godrejproperties",
  "indiamart", "tvsmotorcompany", "johnsoncontrolsindia",
  "drreddyslaboratories", "arcelormittalnipponsteelindia", "delhivery",
  "karurvysyabank", "bajajallianz", "bajajauto", "bajajelectricals",
  "bajajfinserv", "bajajfinservhealth", "bajajhousingfinance", "bajajmarkets",
  "aakash", "dixontechnologies", "heromotocorp", "leapfinance", "mygate",
  "narayanahealth", "redbus", "redingtonindia", "sahyadriindustries",
  "theindianpublicschool",
];
const retiredCompanyNames = [
  "1mg", "Tata 1mg", "Tata1mg", "DishTV", "Dish TV", "DP World", "Stryker",
  "Cars24", "Ashok Leyland", "ADOR", "Fortis Healthcare", "Aditya Birla Capital",
  "Legrand", "Tata Motors", "Godrej Consumer Products", "Godrej Enterprises Group",
  "Godrej Properties", "IndiaMART", "TVS Motor Company", "Johnson Controls India",
  "Johnson Controls", "Dr. Reddy's Laboratories", "ArcelorMittal Nippon Steel India",
  "AM/NS India", "Delhivery", "Karur Vysya Bank", "Bajaj Allianz", "Bajaj Auto",
  "Bajaj Electricals", "Bajaj Finserv", "Bajaj Finserv Health", "Bajaj Housing Finance",
  "Bajaj Markets",
  "Aakash", "Aakash Byju's", "Aakash Educational Services", "Aakash Institute",
  "Akash Institute", "Dixon Technologies", "Hero MotoCorp", "Leap Finance",
  "MyGate", "Narayana Health", "RedBus", "redBus India Pvt Ltd.",
  "Redington India", "Sahyadri Industries", "The Indian Public School (TIPS)",
];
const retiredCompanyFilter = {
  $or: [
    { source: { $in: retiredSources } },
    { company: { $in: retiredCompanyNames } },
  ],
};
const confirmed = process.argv.includes("--confirm");

const { default: connectDB } = await import("../db/db.js");
const { default: Job } = await import("../src/models/Job.js");

try {
  await connectDB();
  const matchedCount = await Job.countDocuments(retiredCompanyFilter);
  console.log(`Matched ${matchedCount} retired-company job record(s).`);

  if (!confirmed) {
    console.log("Preview only. Re-run with --confirm to delete these records.");
  } else {
    const { deletedCount } = await Job.deleteMany(retiredCompanyFilter);
    console.log(`Deleted ${deletedCount} retired-company job record(s).`);
  }
} catch (error) {
  process.exitCode = 1;
  console.error("Retired-company purge failed:", error.message);
} finally {
  await mongoose.disconnect();
}
