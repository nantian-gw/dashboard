import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const realRequire = createRequire(import.meta.url);
const ts = realRequire("typescript");

function loadRateLimit() {
  const source = readFileSync(resolve(root, "src/lib/rate-limit.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const cjsModule = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: cjsModule.exports,
    module: cjsModule,
    require: realRequire,
  });

  return cjsModule.exports;
}

function hostObject(value) {
  return JSON.parse(JSON.stringify(value));
}

test("fixed window limiter allows up to the configured limit", () => {
  const { createFixedWindowRateLimiter } = loadRateLimit();
  let now = 1_000;
  const limiter = createFixedWindowRateLimiter({
    limit: 2,
    windowMs: 1_000,
    now: () => now,
  });

  assert.deepEqual(hostObject(limiter.check("client-a")), {
    allowed: true,
    remaining: 1,
    resetAt: 2_000,
  });
  assert.deepEqual(hostObject(limiter.check("client-a")), {
    allowed: true,
    remaining: 0,
    resetAt: 2_000,
  });
  assert.deepEqual(hostObject(limiter.check("client-a")), {
    allowed: false,
    remaining: 0,
    resetAt: 2_000,
  });
});

test("fixed window limiter resets after the window expires", () => {
  const { createFixedWindowRateLimiter } = loadRateLimit();
  let now = 1_000;
  const limiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 1_000,
    now: () => now,
  });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-a").allowed, false);

  now = 2_001;
  assert.deepEqual(hostObject(limiter.check("client-a")), {
    allowed: true,
    remaining: 0,
    resetAt: 3_001,
  });
});

test("fixed window limiter isolates keys", () => {
  const { createFixedWindowRateLimiter } = loadRateLimit();
  const limiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 1_000,
    now: () => 1_000,
  });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-a").allowed, false);
  assert.equal(limiter.check("client-b").allowed, true);
});

test("fixed window limiter can reset one key or all keys", () => {
  const { createFixedWindowRateLimiter } = loadRateLimit();
  const limiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 1_000,
    now: () => 1_000,
  });

  limiter.check("client-a");
  limiter.check("client-b");
  assert.equal(limiter.check("client-a").allowed, false);
  assert.equal(limiter.check("client-b").allowed, false);

  limiter.reset("client-a");
  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-b").allowed, false);

  limiter.reset();
  assert.equal(limiter.check("client-b").allowed, true);
});

test("fixed window limiter prunes expired buckets during checks", () => {
  const { createFixedWindowRateLimiter } = loadRateLimit();
  let now = 1_000;
  const limiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 1_000,
    now: () => now,
  });

  assert.equal(limiter.check("client-a").allowed, true);
  assert.equal(limiter.check("client-b").allowed, true);
  assert.equal(limiter.size(), 2);

  now = 2_001;
  assert.equal(limiter.check("client-c").allowed, true);

  // Rewind so size() cannot mask stale buckets that check() failed to prune.
  now = 1_000;
  assert.equal(limiter.size(), 1);
});

test("fixed window limiter snapshots options at creation", () => {
  const { createFixedWindowRateLimiter } = loadRateLimit();
  let now = 1_000;
  const options = {
    limit: 1,
    windowMs: 1_000,
    now: () => now,
  };
  const limiter = createFixedWindowRateLimiter(options);

  options.limit = 3;
  options.windowMs = 5_000;

  assert.deepEqual(hostObject(limiter.check("client-a")), {
    allowed: true,
    remaining: 0,
    resetAt: 2_000,
  });
  assert.deepEqual(hostObject(limiter.check("client-a")), {
    allowed: false,
    remaining: 0,
    resetAt: 2_000,
  });

  now = 2_001;
  assert.deepEqual(hostObject(limiter.check("client-a")), {
    allowed: true,
    remaining: 0,
    resetAt: 3_001,
  });
});

test("fixed window limiter rejects invalid options", () => {
  const { createFixedWindowRateLimiter } = loadRateLimit();

  assert.throws(
    () => createFixedWindowRateLimiter({ limit: 0, windowMs: 1_000 }),
    /limit must be a positive integer/
  );
  assert.throws(
    () => createFixedWindowRateLimiter({ limit: 1, windowMs: 0 }),
    /windowMs must be a positive integer/
  );
});
