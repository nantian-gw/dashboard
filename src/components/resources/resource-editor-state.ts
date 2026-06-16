import type { ResourceEditorCodec, ResourceIdentity } from "./resource-editor-types";

export function buildYamlDraft<TFormData>(
  codec: ResourceEditorCodec<TFormData>,
  formData: TFormData
): string {
  return codec.toYaml(formData);
}

export function parseFormDraftFromYaml<TFormData>(
  codec: ResourceEditorCodec<TFormData>,
  yamlText: string
): { ok: true; formData: TFormData } | { ok: false; error: string } {
  try {
    return { ok: true, formData: codec.fromYaml(yamlText) };
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "Invalid YAML.";
    return {
      ok: false,
      error: message,
    };
  }
}

export function assertEditIdentityMatch(
  expectedIdentity: ResourceIdentity | null,
  actualIdentity: ResourceIdentity
): string | null {
  if (!expectedIdentity) return null;
  if (
    expectedIdentity.name === actualIdentity.name &&
    expectedIdentity.namespace === actualIdentity.namespace
  ) {
    return null;
  }

  return `YAML identity must stay on ${expectedIdentity.namespace}/${expectedIdentity.name} while editing this resource.`;
}
