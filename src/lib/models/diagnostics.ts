import type { DiagnosticIssue } from "./types";

import { asArray, asObject, asString } from "./types";

export function mapDiagnostics(
  controlplaneSummary: unknown,
  infrastructure: unknown,
  dataplaneSummary: unknown
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const warning of asArray(asObject(controlplaneSummary).warnings)) {
    issues.push({
      severity: "warning",
      title: asString(warning, "Controlplane warning"),
      source: "controlplane",
    });
  }

  for (const warning of asArray(asObject(infrastructure).warnings)) {
    issues.push({
      severity: "warning",
      title: asString(warning, "Infrastructure warning"),
      source: "infrastructure",
    });
  }

  const dataplaneAvailability = asObject(asObject(dataplaneSummary).availability);
  if (asString(dataplaneAvailability.state) === "degraded") {
    issues.push({
      severity: "warning",
      title: "Dataplane summary unavailable",
      description:
        "Traffic and dataplane diagnostics are limited because the current dashboard session cannot access dataplane /v1/summary.",
      source: "dataplane",
    });
  }

  const warningOverview = asObject(asObject(dataplaneSummary).warningOverview);
  for (const warning of asArray(warningOverview.messages)) {
    issues.push({
      severity: "warning",
      title: asString(warning, "Dataplane warning"),
      source: "dataplane",
    });
  }

  return issues;
}
