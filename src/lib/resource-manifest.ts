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
  const metadata = manifest.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new ResourceManifestError("Manifest metadata must be an object.");
  }

  const metadataRecord = metadata as Record<string, unknown>;
  const name = readRequiredIdentityField(metadataRecord, "name");
  const namespace = readRequiredIdentityField(metadataRecord, "namespace");

  return { name, namespace };
}

function readRequiredIdentityField(
  metadata: Record<string, unknown>,
  field: "name" | "namespace"
): string {
  const value = metadata[field];
  if (value == null) {
    throw new ResourceManifestError(`Manifest metadata.${field} is required.`);
  }

  if (typeof value !== "string") {
    throw new ResourceManifestError(`Manifest metadata.${field} must be a string.`);
  }

  if (!value.trim()) {
    throw new ResourceManifestError(`Manifest metadata.${field} is required.`);
  }

  return value;
}
