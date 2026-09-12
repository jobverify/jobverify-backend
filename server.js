/**
 * Process entry point. HTTP composition lives in src/app.js; this file owns the
 * database, listening socket, maintenance tasks, and termination signals.
 */
import "./loadEnv.js";
import mongoose from "mongoose";
import connectDB from "./db/db.js";
import { createApp } from "./src/app.js";
import { parsePort } from "./src/config/http.js";
import { createPeriodicTask, createShutdown } from "./src/runtime/lifecycle.js";
import { recoverQueuedJobAlerts } from "./src/services/jobAlertService.js";
import { downgradeExpiredPlans } from "./src/services/planService.js";

async function main() {
  const port = parsePort(process.env.PORT);
  let stopping = false;
  const app = createApp({
    isReady: () => !stopping && mongoose.connection.readyState === 1,
  });
  await connectDB();
  let server;
  try {
    server = app.listen(port, "0.0.0.0");
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.once("listening", () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }
  console.log(`Server is running on 0.0.0.0:${port}`);

  const stopTasks = [
    createPeriodicTask(recoverQueuedJobAlerts, {
      intervalMs: 60_000,
      runImmediately: true,
      onError: (error) => console.error("[Job Alerts] Failed to recover queued alerts:", error.message),
    }),
    createPeriodicTask(downgradeExpiredPlans, {
      intervalMs: 60 * 60_000,
      onError: (error) => console.error("[Access Downgrade Sweep] Failed:", error.message),
    }),
  ];
  const shutdown = createShutdown({
    server,
    stopTasks,
    disconnect: () => mongoose.disconnect(),
    onStart: () => { stopping = true; },
  });
  const onSignal = (signal) => {
    console.log(`Received ${signal}; draining requests and background work.`);
    shutdown().catch((error) => {
      console.error("[Shutdown]", error.message);
      process.exit(1);
    });
  };
  process.once("SIGTERM", onSignal);
  process.once("SIGINT", onSignal);
}

main().catch((error) => {
  console.error("[Startup]", error.message);
  process.exit(1);
});
