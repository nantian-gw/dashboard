import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function assertExists(relativePath, label) {
  assert.equal(
    existsSync(resolve(root, relativePath)),
    true,
    `${label}: ${relativePath} should exist`
  );
}

// ── Circuit Breaker page ──────────────────────────────────────

test("circuit breaker page exists and renders", () => {
  assertExists("src/app/[locale]/(dashboard)/circuit-breaker/page.tsx", "circuit breaker page");
});

// ── BackendLBPolicy pages ────────────────────────────────────

test("BackendLBPolicy list page exists", () => {
  assertExists("src/app/[locale]/(dashboard)/backend-lb-policy/page.tsx", "BackendLBPolicy list");
});

test("BackendLBPolicy create page exists", () => {
  assertExists("src/app/[locale]/(dashboard)/backend-lb-policy/create/page.tsx", "BackendLBPolicy create");
});

test("BackendLBPolicy detail page exists", () => {
  assertExists("src/app/[locale]/(dashboard)/backend-lb-policy/[namespace]/[name]/page.tsx", "BackendLBPolicy detail");
});

test("BackendLBPolicy edit page exists", () => {
  assertExists("src/app/[locale]/(dashboard)/backend-lb-policy/[namespace]/[name]/edit/page.tsx", "BackendLBPolicy edit");
});

test("BackendLBPolicy form component exists", () => {
  assertExists("src/components/resources/backendlbpolicy-form.tsx", "BackendLBPolicy form");
});

test("BackendLBPolicy form codec exists", () => {
  assertExists("src/components/resources/backendlbpolicy-form-codec.ts", "BackendLBPolicy form codec");
});

// ── AIService form expansion ─────────────────────────────────

test("AIService form includes model routing fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /routingEnabled/, "should contain routingEnabled field");
  assert.match(source, /model routing/i, "should reference model routing");
});

test("AIService form includes semantic cache fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /cacheEnabled/, "should contain cacheEnabled field");
});

test("AIService form includes prompt guard fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /guardEnabled/, "should contain guardEnabled field");
});

test("AIService form includes content safety fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /safetyEnabled/, "should contain safetyEnabled field");
});

test("AIService form includes PII masking fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /piiEnabled/, "should contain piiEnabled field");
});

test("AIService form includes A/B testing fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /abTestingEnabled/, "should contain abTestingEnabled field");
});

test("AIService form includes fallback chain fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /fallbackEnabled/, "should contain fallbackEnabled field");
});

test("AIService form includes cost tracking fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /costTrackingEnabled/, "should contain costTrackingEnabled field");
});

test("AIService form includes multi-tenant fields", () => {
  const source = readSource("src/components/resources/aiservice-form.tsx");
  assert.match(source, /multiTenantEnabled/, "should contain multiTenantEnabled field");
});

// ── Navigation and plugin registry ──────────────────────────

test("plugin registry includes BackendLBPolicy route", () => {
  const source = readSource("src/plugins/registry.ts");
  assert.match(source, /backend-lb-policy/, "plugin registry should include backend-lb-policy");
});

// ── i18n keys ────────────────────────────────────────────────

test("English i18n has BackendLBPolicy and circuit breaker strings", () => {
  const source = readSource("src/messages/en.json");
  assert.match(source, /circuit\s*breaker/i, "en.json should have circuit breaker strings");
  assert.match(source, /backend\s*lb\s*policy/i, "en.json should have backend lb policy strings");
});

test("Chinese i18n has circuit breaker strings", () => {
  const source = readSource("src/messages/zh.json");
  assert.match(source, /circuitBi|circuit_breaker/, "zh.json should have circuit breaker strings");
});
