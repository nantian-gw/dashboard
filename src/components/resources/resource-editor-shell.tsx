"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LocalizedLink } from "@/components/dashboard/localized-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  ResourceEditorCodec,
  ResourceEditorMode,
  ResourceIdentity,
} from "./resource-editor-types";
import {
  assertEditIdentityMatch,
  buildYamlDraft,
  parseFormDraftFromYaml,
} from "./resource-editor-state";

interface ResourceEditorShellProps<TFormData> {
  title: string;
  description: string;
  backHref: string;
  submitLabel: string;
  submittingLabel: string;
  formData: TFormData;
  onFormDataChange: (next: TFormData) => void;
  codec: ResourceEditorCodec<TFormData>;
  expectedEditIdentity: ResourceIdentity | null;
  isSubmitting: boolean;
  submitError: string;
  onSubmitManifest: (yamlText: string) => Promise<void>;
  renderForm: (props: { value: TFormData; onChange: (next: TFormData) => void }) => ReactNode;
}

export function ResourceEditorShell<TFormData>({
  title,
  description,
  backHref,
  submitLabel,
  submittingLabel,
  formData,
  onFormDataChange,
  codec,
  expectedEditIdentity,
  isSubmitting,
  submitError,
  onSubmitManifest,
  renderForm,
}: ResourceEditorShellProps<TFormData>) {
  const t = useTranslations("resource_editor");
  const [mode, setMode] = useState<ResourceEditorMode>("form");
  const [yamlText, setYamlText] = useState(() => buildYamlDraft(codec, formData));
  const [yamlError, setYamlError] = useState("");

  const switchMode = (nextMode: string) => {
    if (nextMode === "yaml") {
      setYamlText(buildYamlDraft(codec, formData));
      setYamlError("");
      setMode("yaml");
      return;
    }

    const parsed = parseFormDraftFromYaml(codec, yamlText);
    if (!parsed.ok) {
      setYamlError(parsed.error);
      return;
    }

    onFormDataChange(parsed.formData);
    setYamlError("");
    setMode("form");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (mode === "form") {
      await onSubmitManifest(buildYamlDraft(codec, formData));
      return;
    }

    const parsed = parseFormDraftFromYaml(codec, yamlText);
    if (!parsed.ok) {
      setYamlError(parsed.error);
      return;
    }

    const identityError = assertEditIdentityMatch(
      expectedEditIdentity,
      codec.getIdentity(parsed.formData)
    );
    if (identityError) {
      setYamlError(identityError);
      return;
    }

    await onSubmitManifest(yamlText);
  };

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-5xl px-4">
        <div className="mb-8 flex items-center gap-4">
          <LocalizedLink href={backHref}>
            <Button variant="ghost" size="icon">
              <span className="h-4 w-4">&#8592;</span>
            </Button>
          </LocalizedLink>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <Tabs value={mode} onValueChange={switchMode}>
            <TabsList>
              <TabsTrigger value="form">{t("form_tab")}</TabsTrigger>
              <TabsTrigger value="yaml">{t("yaml_tab")}</TabsTrigger>
            </TabsList>
            <TabsContent value="form">
              {renderForm({ value: formData, onChange: onFormDataChange })}
            </TabsContent>
            <TabsContent value="yaml">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("yaml_tab")}</CardTitle>
                  <CardDescription>{t("yaml_help")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="resource-yaml">{codec.kind}</Label>
                    <Textarea
                      id="resource-yaml"
                      value={yamlText}
                      onChange={(event) => setYamlText(event.target.value)}
                      className="min-h-[480px] font-mono text-sm"
                      spellCheck={false}
                    />
                  </div>
                  {(yamlError || submitError) && (
                    <p className="text-sm text-red-600">{yamlError || submitError}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {mode === "form" && submitError ? (
            <p className="text-sm text-red-600">{submitError}</p>
          ) : null}

          <div className="flex items-center justify-between">
            <LocalizedLink href={backHref}>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </LocalizedLink>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
