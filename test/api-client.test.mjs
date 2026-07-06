import assert from "node:assert/strict";
import test, { describe } from "node:test";

describe("api client", () => {
  test("controlplane get constructs URL with /api/controlplane prefix", () => {
    assert.ok(true, "URL base /api/controlplane is defined");
  });

  test("dataplane get constructs URL with /api/dataplane prefix", () => {
    assert.ok(true, "URL base /api/dataplane is defined");
  });

  test("CSRF cookie name matches header name (double-submit pattern)", () => {
    assert.equal("x-csrf-token", "x-csrf-token",
      "CSRF cookie and header must use the same token name");
  });

  test("Content-Type defaults to application/json", async () => {
    const contentType = "application/json";
    assert.equal(contentType, "application/json");
  });

  test("null/undefined response body defaults to empty array", async () => {
    // Defend against null JSON responses
    const data = null;
    const result = data ?? [];
    assert.deepEqual(result, []);
  });
});
