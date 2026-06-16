export type ResourceEditorMode = "form" | "yaml";

export interface ResourceIdentity {
  name: string;
  namespace: string;
}

export interface ResourceEditorCodec<TFormData> {
  apiVersion: string;
  kind: string;
  toYaml(formData: TFormData): string;
  fromYaml(yamlText: string): TFormData;
  getIdentity(formData: TFormData): ResourceIdentity;
}
