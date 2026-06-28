"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { applyResource } from "@/lib/api";
import { ResourceEditorShell } from "./resource-editor-shell";
import type { ResourceEditorCodec } from "./resource-editor-types";

interface RouteFormShellProps<T> {
  kind: string;
  mode: "create" | "edit";
  initialData?: T;
  onSuccess?: () => void;
  createEmpty: () => T;
  codec: ResourceEditorCodec<T>;
  manifestToFormData: (yamlText: string) => T;
  resourcePath: string;
  renderForm: (props: { value: T; onChange: (next: T) => void; disableIdentityFields: boolean }) => ReactNode;
  validateRules?: (formData: T, t: ReturnType<typeof useTranslations>) => string | null;
}

export function RouteFormShell<T extends { name: string; namespace: string; gatewayName: string }>({
  kind,
  mode,
  initialData,
  onSuccess,
  createEmpty,
  codec,
  manifestToFormData,
  resourcePath,
  renderForm,
  validateRules,
}: RouteFormShellProps<T>) {
  const t = useTranslations();
  const [formData, setFormData] = useState<T>(initialData ?? createEmpty());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  return (
    <ResourceEditorShell
      title={
        isEdit
          ? t("create.route.edit_title", { kind })
          : t("create.route.title", { kind })
      }
      description={
        isEdit
          ? t("create.route.edit_description", { kind })
          : t("create.route.description", { kind })
      }
      backHref="/routes"
      submitLabel={
        isEdit
          ? t("create.route.save", { kind })
          : t("create.route.submit", { kind })
      }
      submittingLabel={isEdit ? t("create.route.saving") : t("create.route.creating")}
      formData={formData}
      onFormDataChange={setFormData}
      codec={codec}
      expectedEditIdentity={isEdit ? codec.getIdentity(formData) : null}
      isSubmitting={isLoading}
      submitError={error}
      onSubmitManifest={async (yamlText) => {
        setIsLoading(true);
        setError("");

        try {
          const nextFormData = manifestToFormData(yamlText);

          if (!nextFormData.name.trim()) {
            setError(t("create.route.error_need_name"));
            setIsLoading(false);
            return;
          }

          if (!nextFormData.gatewayName.trim()) {
            setError(t("create.route.error_need_gateway"));
            setIsLoading(false);
            return;
          }

          if (validateRules) {
            const ruleError = validateRules(nextFormData, t);
            if (ruleError) {
              setError(ruleError);
              setIsLoading(false);
              return;
            }
          }

          const path = isEdit
            ? `/v1/resources/${resourcePath}/${formData.namespace}/${formData.name}`
            : "/v1/resources";
          const response = await applyResource(yamlText, path);
          if (!response.ok) {
            throw new Error((await response.text()) || `Failed to ${mode}: ${response.status}`);
          }

          setFormData(nextFormData);
          onSuccess?.();
        } catch (submitError) {
          setError((submitError as Error).message || t("create.route.error_failed_create"));
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      }}
      renderForm={({ value, onChange }) =>
        renderForm({ value, onChange, disableIdentityFields: isEdit })
      }
    />
  );
}
