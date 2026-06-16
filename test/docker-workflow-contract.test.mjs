import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("docker workflow publishes release tag images without changing main semantics", () => {
  const source = readSource(".github/workflows/docker.yml");

  assert.match(
    source,
    /push:\s*\n\s*branches:\s*\[main\]\s*\n\s*tags:\s*\["v\*"\]/,
    "docker workflow must trigger on v* release tags"
  );
  assert.match(
    source,
    /type=ref,event=tag/,
    "docker metadata must emit a release tag image tag"
  );
  assert.match(
    source,
    /name:\s+Login to GHCR[\s\S]*?if:\s+github\.event_name == 'push'/,
    "GHCR login must run for push events, including release tags"
  );
  assert.match(
    source,
    /name:\s+Build and push[\s\S]*?push:\s+\$\{\{\s*github\.event_name == 'push'\s*\}\}/,
    "docker build step must push on push events, including release tags"
  );
  assert.match(
    source,
    /type=raw,value=latest,enable=\$\{\{\s*github\.ref == 'refs\/heads\/main'\s*\}\}/,
    "latest must remain reserved for main"
  );
});
