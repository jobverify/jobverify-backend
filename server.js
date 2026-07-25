/**
 * @file Entry point for the Jobify Express backend application.
 * @module server
 */

import "./loadEnv.js";
import express from "express";
import cors from "cors";
import connectDB from "./db/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import helmet from "helmet";
import jobRoutes from "./src/routes/jobRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import scrapeRoutes from "./src/routes/scrapeRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import billingRoutes from "./src/routes/billingRoutes.js";
import { createCsrfProtection } from "./src/middleware/csrfProtection.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { createRateLimiter } from "./src/utils/rateLimit.js";
import {
  requireEnv,
  requireOneOf,
  resolvePublicApiOrigin,
} from "./src/utils/runtimeConfig.js";
import { requireJsonMutation } from "./src/middleware/validateRequest.js";
import { isJwtSecretStrong } from "./src/utils/authSecurity.js";
import { createOriginAllowlist } from "./src/utils/originAllowlist.js";
import { downgradeExpiredPlans } from "./src/services/planService.js";

const parseTrustProxy = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized || ["false", "0", "off"].includes(normalized)) {
    return false;
  }

  if (["true", "1"].includes(normalized)) {
    return 1;
  }

  const numericValue = Number.parseInt(normalized, 10);
  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return value;
};

const parseOriginList = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const app = express();
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));
app.disable("x-powered-by");

const nodeEnv = String(process.env.NODE_ENV || "").trim().toLowerCase();
const jwtSecret = requireEnv("JWT_SECRET");
const allowedOrigins = parseOriginList(requireEnv("CORS_ORIGIN"));
const originAllowlist = createOriginAllowlist(allowedOrigins, {
  allowDevLoopback: nodeEnv !== "production",
});

if (nodeEnv === "production" && !isJwtSecretStrong(jwtSecret)) {
  throw new Error("JWT_SECRET must be at least 32 characters long in production.");
}

if (nodeEnv === "production") {
  requireOneOf(["FRONTEND_ORIGIN", "CORS_ORIGIN"]);
  resolvePublicApiOrigin();
}

app.use(express.json({
  limit: "32kb",
  verify: (req, _res, buffer) => {
    if (req.originalUrl === "/api/billing/webhook") {
      req.rawBody = buffer.toString("utf8");
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: false,
    referrerPolicy: { policy: "no-referrer" },
    hsts: nodeEnv === "production"
      ? {
          maxAge: 15552000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  }),
);

// Dynamic CORS configuration supporting multiple origins (e.g. localhost, 127.0.0.1, or prod URLs)
app.use(
  cors({
    // Validates if the request origin is allowed by CORS.
    origin: (origin, callback) => {
      if (!origin || originAllowlist.has(origin)) {
        callback(null, true);
      } else {
        callback(null, false); // Return false instead of throwing to avoid crashing the server
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);
app.use("/api", requireJsonMutation);
app.use(
  "/api",
  createCsrfProtection({
    allowedOrigins,
    allowDevLoopback: nodeEnv !== "production",
    exemptPaths: ["/api/billing/webhook"],
  }),
);

const isSignInRequest = (req) => {
  const path = String(req.originalUrl || "").split("?")[0];
  return req.method === "POST" && path === "/api/auth/login";
};

// Global API Rate Limiting
const limiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  skip: isSignInRequest,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    code: 429,
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
});
app.use("/api", limiter); // Apply to all /api routes

const noStore = (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
};

// Routes
app.use("/api/auth", noStore, authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/user", noStore, userRoutes);
app.use("/api/billing", noStore, billingRoutes);
app.use("/api/scrape", noStore, scrapeRoutes);
app.use("/api/admin", noStore, adminRoutes);
app.get("/", (req, res) => {
  res.send("Hello from the Jobify Backend!");
});
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

const PORT = requireEnv("PORT");

// Connect to database before starting the server
await connectDB();

setInterval(() => {
  downgradeExpiredPlans().catch((error) => {
    console.error("[Access Downgrade Sweep] Failed:", error.message);
  });
}, 60 * 60 * 1000).unref();


// Starts the Express server and listens for incoming requests on the specified port.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on 0.0.0.0:${PORT}`);
});
