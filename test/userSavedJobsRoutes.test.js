import assert from "node:assert/strict";
import test from "node:test";

test("user routes expose protected saved job endpoints", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = originalJwtSecret || "x".repeat(32);

  try {
    const { default: router } = await import("../src/routes/userRoutes.js");

    const listLayer = router.stack.find(
      (layer) => layer.route?.path === "/saved-jobs" && layer.route.methods.get,
    );
    assert.ok(listLayer);
    assert.equal(listLayer.route.stack[0].name, "protect");
    assert.equal(listLayer.route.stack.at(-1).name, "getSavedJobs");

    const saveLayer = router.stack.find(
      (layer) => layer.route?.path === "/saved-jobs/:jobId" && layer.route.methods.post,
    );
    assert.ok(saveLayer);
    assert.equal(saveLayer.route.stack[0].name, "protect");
    assert.equal(
      saveLayer.route.stack.filter((layer) => layer.method === "post").at(-1)?.name,
      "saveJob",
    );

    const removeLayer = router.stack.find(
      (layer) => layer.route?.path === "/saved-jobs/:jobId" && layer.route.methods.delete,
    );
    assert.ok(removeLayer);
    assert.equal(removeLayer.route.stack[0].name, "protect");
    assert.equal(
      removeLayer.route.stack.filter((layer) => layer.method === "delete").at(-1)?.name,
      "removeSavedJob",
    );
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});
