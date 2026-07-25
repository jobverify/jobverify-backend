/**
 * @file Database connection utility using Mongoose.
 * @module db/db
 */

import mongoose from "mongoose";
import "../loadEnv.js";

if (!process.env.MONGO_URI) {
  console.error(
    "[Config Error] MONGO_URI is not defined or cannot be accessed in the .env configuration.",
  );
  throw new Error("MONGO_URI environment variable is not defined.");
}

// Connects to the MongoDB database using the loaded connection string.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected:", conn.connection.host);
    return conn;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }
};

export default connectDB;
