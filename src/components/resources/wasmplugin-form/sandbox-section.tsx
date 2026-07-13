"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WasmPluginSandboxProps {
  maxMemoryBytes: number;
  maxExecutionTimeMs: number;
  allowNetwork: boolean;
  allowFileSystem: boolean;
  onMaxMemoryBytesChange: (value: number) => void;
  onMaxExecutionTimeMsChange: (value: number) => void;
  onAllowNetworkChange: (value: boolean) => void;
  onAllowFileSystemChange: (value: boolean) => void;
}

export function WasmPluginSandbox({
  maxMemoryBytes,
  maxExecutionTimeMs,
  allowNetwork,
  allowFileSystem,
  onMaxMemoryBytesChange,
  onMaxExecutionTimeMsChange,
  onAllowNetworkChange,
  onAllowFileSystemChange,
}: WasmPluginSandboxProps) {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("wasm.plugins.form.sandbox_title")}</CardTitle>
        <CardDescription>{t("wasm.plugins.form.sandbox_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="maxMemory">{t("wasm.plugins.form.max_memory")}</Label>
            <Input
              id="maxMemory"
              type="number"
              value={maxMemoryBytes}
              onChange={(e) => onMaxMemoryBytesChange(parseInt(e.target.value, 10) || 0)}
              placeholder="0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxExec">{t("wasm.plugins.form.max_exec_time")}</Label>
            <Input
              id="maxExec"
              type="number"
              value={maxExecutionTimeMs}
              onChange={(e) => onMaxExecutionTimeMsChange(parseInt(e.target.value, 10) || 0)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="allowNet">{t("wasm.plugins.form.allow_network")}</Label>
            <Select value={allowNetwork ? "true" : "false"} onValueChange={(v) => onAllowNetworkChange(v === "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("wasm.plugins.form.enabled")}</SelectItem>
                <SelectItem value="false">{t("wasm.plugins.form.disabled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="allowFs">{t("wasm.plugins.form.allow_filesystem")}</Label>
            <Select value={allowFileSystem ? "true" : "false"} onValueChange={(v) => onAllowFileSystemChange(v === "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("wasm.plugins.form.enabled")}</SelectItem>
                <SelectItem value="false">{t("wasm.plugins.form.disabled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
