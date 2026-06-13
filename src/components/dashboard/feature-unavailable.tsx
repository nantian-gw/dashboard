"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FeatureUnavailable() {
  const t = useTranslations();
  const { locale } = useParams() as { locale: string };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t("feature_unavailable.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("feature_unavailable.description")}
        </p>
        <Button asChild size="sm">
          <Link href={`/${locale}/overview`}>
            {t("feature_unavailable.back_to_overview")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
