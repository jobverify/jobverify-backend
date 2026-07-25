import assert from "node:assert/strict";
import test from "node:test";

test("auth routes keep logout protected and split verify-email GET and POST handlers", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;

  process.env.JWT_SECRET = originalJwtSecret || "x".repeat(32);
  process.env.FRONTEND_ORIGIN = originalFrontendOrigin || "http://localhost:5173";

  try {
    const { default: router } = await import("../src/routes/authRoutes.js");

    const logoutLayer = router.stack.find(
      (layer) => layer.route?.path === "/logout" && layer.route.methods.post,
    );
    assert.ok(logoutLayer);
    assert.equal(logoutLayer.route.stack[0].name, "protect");
    assert.equal(logoutLayer.route.stack.at(-1).name, "logout");

    const verifyGetLayer = router.stack.find(
      (layer) => layer.route?.path === "/verify-email" && layer.route.methods.get,
    );
    assert.ok(verifyGetLayer);
    assert.equal(verifyGetLayer.route.stack.at(-1).name, "redirectVerifyEmail");

    const verifyPostLayer = router.stack.find(
      (layer) => layer.route?.path === "/verify-email" && layer.route.methods.post,
    );
    assert.ok(verifyPostLayer);
    assert.equal(verifyPostLayer.route.stack.at(-1).name, "verifyEmail");

    const forgotPasswordLayer = router.stack.find(
      (layer) => layer.route?.path === "/forgot-password" && layer.route.methods.post,
    );
    assert.ok(forgotPasswordLayer);
    assert.equal(forgotPasswordLayer.route.stack.at(-1).name, "requestPasswordReset");

    const resetPasswordLayer = router.stack.find(
      (layer) => layer.route?.path === "/reset-password" && layer.route.methods.post,
    );
    assert.ok(resetPasswordLayer);
    assert.equal(resetPasswordLayer.route.stack.at(-1).name, "resetPassword");
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
  }
});
