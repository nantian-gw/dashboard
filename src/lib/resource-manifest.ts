import yaml from "js-yaml";

export class ResourceManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceManifestError";
  }
}

export type ManifestRecord = Record<string, unknown>;

export function parseSingleManifest(yamlText: string): ManifestRecord {
  const docs = yaml.loadAll(yamlText);
  if (docs.length !== 1) {
    throw new ResourceManifestError("Expected exactly one YAML document.");
  }

  const [doc] = docs;
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    throw new ResourceManifestError("Expected a YAML object document.");
  }

  return doc as ManifestRecord;
}

export function assertManifestKind(
  manifest: ManifestRecord,
  expectedApiVersion: string,
  expectedKind: string
): void {
  if (manifest.apiVersion !== expectedApiVersion) {
    throw new ResourceManifestError(`Expected apiVersion ${expectedApiVersion}.`);
  }

  if (manifest.kind !== expectedKind) {
    throw new ResourceManifestError(`Expected kind ${expectedKind}.`);
  }
}

export function readManifestIdentity(manifest: ManifestRecord): {
  name: string;
  namespace: string;
} {
  const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
  const name = String(metadata.name ?? "");
  const namespace = String(metadata.namespace ?? "");

  if (!name.trim()) {
    throw new ResourceManifestError("Manifest metadata.name is required.");
  }

  if (!namespace.trim()) {
    throw new ResourceManifestError("Manifest metadata.namespace is required.");
  }

  return { name, namespace };
}
