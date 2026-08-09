import assert from "node:assert/strict";
import test from "node:test";

import { configureMongoDns } from "../src/utils/mongoDns.js";

test("configureMongoDns uses public resolvers for MongoDB SRV lookups", () => {
  const configuredServers = [];

  configureMongoDns({
    setServers: (servers) => configuredServers.push(servers),
  });

  assert.deepEqual(configuredServers, [["1.1.1.1", "8.8.8.8"]]);
});
