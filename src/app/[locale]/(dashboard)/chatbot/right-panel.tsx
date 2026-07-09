"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  GitCompare,
  Network,
  CheckCircle,
  Zap,
} from "lucide-react";

// ─── ManifestTab ────────────────────────────────────────────────────────────

const ManifestTab = memo(function ManifestTab({
  manifests,
}: {
  manifests?: string;
}) {
  const t = useTranslations();
  if (!manifests) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <FileText className="h-8 w-8 opacity-40" />
        <p className="text-sm">{t("chatbot.manifest.empty")}</p>
      </div>
    );
  }

  const handleApply = async () => {
    try {
      const res = await fetch("/api/controlplane/v1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/yaml" },
        body: manifests,
      });
      if (!res.ok) throw new Error(`Apply failed: ${res.status}`);
      toast.success(t("chatbot.manifest.applySuccess"));
    } catch {
      toast.error(t("chatbot.manifest.applyFailed"));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="outline" className="gap-1 text-xs">
          <CheckCircle className="h-3 w-3 text-emerald-500" />
          {t("chatbot.manifest.valid")}
        </Badge>
        <Button size="sm" onClick={handleApply}>
          <Zap className="mr-1.5 h-3.5 w-3.5" />
          {t("chatbot.manifest.apply")}
        </Button>
      </div>
      <pre className="flex-1 overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed text-foreground/80">
        <code>{manifests}</code>
      </pre>
    </div>
  );
});

// ─── DiffIRTab ──────────────────────────────────────────────────────────────

const DiffIRTab = memo(function DiffIRTab({
  diff,
  ir,
}: {
  diff?: string;
  ir?: string;
}) {
  const t = useTranslations();

  if (!diff && !ir) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <GitCompare className="h-8 w-8 opacity-40" />
        <p className="text-sm">{t("chatbot.diffir.empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {diff && (
        <div className="flex-1 overflow-hidden">
          <div className="mb-2 flex items-center gap-2">
            <GitCompare className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium">
              {t("chatbot.diffir.diff")}
            </span>
          </div>
          <pre className="h-[calc(100%-1.75rem)] overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
            <code>{diff}</code>
          </pre>
        </div>
      )}
      {ir && (
        <div className="flex-1 overflow-hidden">
          <div className="mb-2 flex items-center gap-2">
            <Network className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium">
              {t("chatbot.diffir.ir")}
            </span>
          </div>
          <pre className="h-[calc(100%-1.75rem)] overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed">
            <code>{ir}</code>
          </pre>
        </div>
      )}
    </div>
  );
});

// ─── RightPanel ─────────────────────────────────────────────────────────────

interface RightPanelProps {
  activeManifests?: string;
  activeDiff?: string;
  activeIR?: string;
  rightPanel: "manifest" | "diffir";
  onToggle: (panel: "manifest" | "diffir") => void;
}

export function RightPanel({
  activeManifests,
  activeDiff,
  activeIR,
  rightPanel,
  onToggle,
}: RightPanelProps) {
  const t = useTranslations();

  return (
    <Card className="flex flex-col overflow-hidden">
      <Tabs
        value={rightPanel}
        onValueChange={(v) => onToggle(v as typeof rightPanel)}
        className="flex h-full flex-col"
      >
        <CardHeader className="shrink-0 space-y-0 px-3 py-2">
          <TabsList className="w-full">
            <TabsTrigger value="manifest" className="flex-1 gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              {t("chatbot.tabs.manifest")}
            </TabsTrigger>
            <TabsTrigger value="diffir" className="flex-1 gap-1.5 text-xs">
              <GitCompare className="h-3.5 w-3.5" />
              {t("chatbot.tabs.diffir")}
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <Separator />
        <CardContent className="flex-1 overflow-auto p-4">
          <TabsContent value="manifest" className="mt-0 h-full">
            <ManifestTab manifests={activeManifests} />
          </TabsContent>
          <TabsContent value="diffir" className="mt-0 h-full">
            <DiffIRTab diff={activeDiff} ir={activeIR} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
