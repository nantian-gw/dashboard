import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadAdminModels() {
  const source = readFileSync(resolve(root, "src/lib/admin-models.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require,
  });
  return cjsModule.exports;
}

test("controlplane summary derives listener health from listener statuses when counts are absent", () => {
  const { mapControlplaneSummary } = loadAdminModels();

  const summary = mapControlplaneSummary(
    {
      gatewayCount: 1,
      listenerCount: 5,
    },
    [
      { status: { programmed: { status: "True" } } },
      { status: { programmed: { status: "False" } } },
      { status: { programmed: { status: "Unknown" } } },
      { status: { programmed: { status: "Accepted" } } },
      { status: {} },
    ]
  );

  assert.equal(summary.readyListenerCount, 1);
  assert.equal(summary.failedListenerCount, 1);
  assert.equal(summary.warningListenerCount, 3);
});

test("controlplane summary keeps explicit listener health counts including zero", () => {
  const { mapControlplaneSummary } = loadAdminModels();

  const summary = mapControlplaneSummary(
    {
      readyListenerCount: 0,
      warningListenerCount: 2,
      failedListenerCount: 0,
    },
    [
      { status: { programmed: { status: "True" } } },
      { status: { programmed: { status: "False" } } },
    ]
  );

  assert.equal(summary.readyListenerCount, 0);
  assert.equal(summary.warningListenerCount, 2);
  assert.equal(summary.failedListenerCount, 0);
});

test("node payload does not report disconnected dataplanes as ready", () => {
  const { mapNodePayload } = loadAdminModels();

  const rows = mapNodePayload([
    {
      nodeId: "dp-offline",
      connected: false,
      ready: true,
      lastConfigStatus: "ACK",
      lastAckVersion: "v1",
      lastSentVersion: "v1",
      lastSeenAt: "2026-05-21T05:00:00Z",
    },
    {
      nodeId: "dp-ready",
      connected: true,
      ready: true,
      lastConfigStatus: "ACK",
      lastAckVersion: "v1",
      lastSentVersion: "v1",
    },
  ]);

  assert.equal(rows[0].connected, false);
  assert.equal(rows[0].ready, false);
  assert.equal(rows[0].status, "Disconnected");
  assert.equal(rows[0].ackState, "Disconnected");
  assert.equal(rows[1].connected, true);
  assert.equal(rows[1].ready, true);
  assert.equal(rows[1].status, "Ready");
});
