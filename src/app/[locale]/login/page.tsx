"use client";

import { signIn } from "next-auth/react";
import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Eye } from "lucide-react";
import { EyeOff } from "lucide-react";
import { Upload } from "lucide-react";
import { Loader2 } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { FileText } from "lucide-react";
import jsyaml from "js-yaml";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("token");
  const [fileName, setFileName] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        token,
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.code === "network" ? t("error_network") : t("error_invalid")
        );
      } else {
        router.push(`/${locale}/overview`);
      }
    } catch {
      setError(t("error_network"));
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const doc = jsyaml.load(event.target?.result as string) as Record<string, unknown> | undefined;
        const users = doc?.users as unknown[] | undefined;
        const firstUser = users?.[0] as Record<string, unknown> | undefined;
        const userObj = firstUser?.user as Record<string, unknown> | undefined;
        const extracted = userObj?.token as string | undefined;
        if (extracted) {
          setToken(extracted);
          setError("");
        } else {
          setError(t("error_parse"));
          setToken("");
        }
      } catch {
        setError(t("error_parse"));
        setToken("");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/25">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">{t("subtitle")}</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Card className="border-slate-800/60 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v);
              setError("");
            }}
          >
            <CardHeader className="pb-0">
              <TabsList className="w-full bg-slate-800/50">
                <TabsTrigger value="token" className="flex-1">
                  <Key className="mr-1.5 h-4 w-4" />
                  {t("tab_token")}
                </TabsTrigger>
                <TabsTrigger value="kubeconfig" className="flex-1">
                  <FileText className="mr-1.5 h-4 w-4" />
                  {t("tab_kubeconfig")}
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleLogin}>
                <TabsContent value="token" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-slate-300">
                      {t("token_label")}
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="token"
                        className="min-h-[100px] resize-y pr-10 border-slate-700/60 bg-slate-800/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500/50"
                        placeholder={t("token_placeholder")}
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                        aria-label={showToken ? t("hide_token") : t("show_token")}
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{t("token_help")}</p>
                  </div>
                </TabsContent>

                <TabsContent value="kubeconfig" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      {t("file_label")}
                    </Label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-700/60 bg-slate-800/30 px-6 py-8 text-center transition-colors hover:border-sky-500/50 hover:bg-slate-800/50"
                    >
                      <Upload className="h-8 w-8 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-300">
                          {fileName || t("file_label")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t("file_help")}
                        </p>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".yaml,.yml"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {token && (
                      <div className="rounded-md border border-slate-700/60 bg-slate-800/30 px-3 py-2">
                        <p className="text-xs font-medium text-emerald-400">
                          {t("token_extracted")}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {token.substring(0, 48)}...
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <Button
                  type="submit"
                  className="mt-4 w-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/20 transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-sky-500/30"
                  disabled={loading || !token}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("signing_in")}
                    </>
                  ) : (
                    t("sign_in")
                  )}
                </Button>
              </form>
            </CardContent>
          </Tabs>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-600">
          {t("footer_brand")}
        </p>
      </div>
    </div>
  );
}

function Key(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3Z" />
    </svg>
  );
}
