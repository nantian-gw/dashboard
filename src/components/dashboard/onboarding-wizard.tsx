"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoutDashboard, Globe, Route, BarChart3, Bot, ChevronRight, ChevronLeft, Check } from "lucide-react";

const ONBOARDING_STORAGE_KEY = "nantian-dashboard-onboarding-completed";

const STEPS = [
  {
    icon: LayoutDashboard,
    titleKey: "onboarding.step1_title",
    descKey: "onboarding.step1_desc",
  },
  {
    icon: Globe,
    titleKey: "onboarding.step2_title",
    descKey: "onboarding.step2_desc",
  },
  {
    icon: Route,
    titleKey: "onboarding.step3_title",
    descKey: "onboarding.step3_desc",
  },
  {
    icon: BarChart3,
    titleKey: "onboarding.step4_title",
    descKey: "onboarding.step4_desc",
  },
  {
    icon: Bot,
    titleKey: "onboarding.step5_title",
    descKey: "onboarding.step5_desc",
  },
];

export function OnboardingWizard() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setOpen(false);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      complete();
    }
  }, [step, complete]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const StepIcon = STEPS[step].icon;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <StepIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{t(STEPS[step].titleKey)}</DialogTitle>
          <DialogDescription className="text-center">
            {t(STEPS[step].descKey)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={skip}>
            {t("onboarding.skip")}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={prev}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("onboarding.back")}
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {step === STEPS.length - 1 ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  {t("onboarding.finish")}
                </>
              ) : (
                <>
                  {t("onboarding.next")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}