import assert from "node:assert/strict";
import test from "node:test";

test("resolvePublicApiOrigin treats the backend public origin as optional", async () => {
  const { resolvePublicApiOrigin } = await import("../src/utils/runtimeConfig.js");

  assert.equal(
    resolvePublicApiOrigin({
      PUBLIC_API_ORIGIN: "",
      API_PUBLIC_ORIGIN: "",
      BACKEND_PUBLIC_ORIGIN: "",
    }),
    "",
  );
});
