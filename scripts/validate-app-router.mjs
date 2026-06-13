#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function readSource(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function hasClientDirective(source) {
  const firstLine = source.trimStart().split(/\r?\n/, 1)[0]?.trim();
  return firstLine === '"use client";' || firstLine === "'use client';";
}

const apiHookPath = "src/hooks/use-api.ts";
if (!hasClientDirective(readSource(apiHookPath))) {
  failures.push(
    `${apiHookPath} must start with "use client"; because it exports React Query hooks.`
  );
}

const requestConfigPath = "src/i18n/request.ts";
if (!/\btimeZone\s*:/.test(readSource(requestConfigPath))) {
  failures.push(
    `${requestConfigPath} must configure timeZone to keep next-intl server/client formatting deterministic.`
  );
}

for (const providerPath of [
  "src/app/[locale]/(dashboard)/locale-layout-client.tsx",
  "src/app/[locale]/login/layout.tsx",
]) {
  if (!/\btimeZone\s*=/.test(readSource(providerPath))) {
    failures.push(
      `${providerPath} must pass timeZone to NextIntlClientProvider during server rendering.`
    );
  }
}

if (failures.length > 0) {
  console.error("Dashboard App Router contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
