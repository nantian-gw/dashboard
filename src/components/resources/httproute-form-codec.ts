import type { ManagedResource, KubernetesResource } from "@/lib/admin-models";
import { unwrapResource } from "@/lib/admin-models";
import {
  assertManifestKind,
  parseSingleManifest,
  readManifestIdentity,
  type ManifestRecord,
} from "@/lib/resource-manifest";
import type { ResourceEditorCodec } from "./resource-editor-types";
import type {
  BackendRef,
  HeaderMatch,
  HeaderModifier,
  HTTPRouteFormData,
  QueryParamMatch,
  RouteRule,
  RuleFilter,
} from "./httproute-form";

function createEmptyBackendRef(namespace = "default"): BackendRef {
  return { name: "", namespace, port: 80, weight: 100 };
}

function createEmptyRule(): RouteRule {
  return {
    pathMatch: "/",
    method: "",
    headerMatches: [],
    queryParamMatches: [],
    filters: [],
    requestTimeout: "",
    backends: [createEmptyBackendRef()],
  };
}

function readNameValueEntries(rawEntries: unknown) {
  return Array.isArray(rawEntries)
    ? rawEntries.map((rawEntry) => {
        const entry =
          rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry)
            ? (rawEntry as Record<string, unknown>)
            : {};

        return {
          name: String(entry.name ?? ""),
          value: String(entry.value ?? ""),
        };
      })
    : [];
}

function readStringEntries(rawEntries: unknown) {
  return Array.isArray(rawEntries)
    ? rawEntries.map((entry) => String(entry ?? "")).filter((entry) => entry.trim())
    : [];
}

function readHeaderMatches(rawEntries: unknown): HeaderMatch[] {
  return Array.isArray(rawEntries)
    ? rawEntries.map((rawEntry) => {
        const entry =
          rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry)
            ? (rawEntry as Record<string, unknown>)
            : {};

        return {
          type: entry.type === "RegularExpression" ? "RegularExpression" : "Exact",
          name: String(entry.name ?? ""),
          value: String(entry.value ?? ""),
        };
      })
    : [];
}

function readQueryParamMatches(rawEntries: unknown): QueryParamMatch[] {
  return Array.isArray(rawEntries)
    ? rawEntries.map((rawEntry) => {
        const entry =
          rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry)
            ? (rawEntry as Record<string, unknown>)
            : {};

        return {
          type: entry.type === "RegularExpression" ? "RegularExpression" : "Exact",
          name: String(entry.name ?? ""),
          value: String(entry.value ?? ""),
        };
      })
    : [];
}

function readFilters(rawFilters: unknown): RuleFilter[] {
  if (!Array.isArray(rawFilters)) {
    return [];
  }

  const filters: RuleFilter[] = [];

  for (const rawFilter of rawFilters) {
    const filter =
      rawFilter && typeof rawFilter === "object" && !Array.isArray(rawFilter)
        ? (rawFilter as Record<string, unknown>)
        : {};

    if (filter.type === "RequestHeaderModifier" && filter.requestHeaderModifier) {
      const modifier = filter.requestHeaderModifier as Record<string, unknown>;
      filters.push({
        type: "RequestHeaderModifier",
        config: {
          set: readNameValueEntries(modifier.set),
          add: readNameValueEntries(modifier.add),
          remove: readStringEntries(modifier.remove),
        },
      });
      continue;
    }

    if (filter.type === "ResponseHeaderModifier" && filter.responseHeaderModifier) {
      const modifier = filter.responseHeaderModifier as Record<string, unknown>;
      filters.push({
        type: "ResponseHeaderModifier",
        config: {
          set: readNameValueEntries(modifier.set),
          add: readNameValueEntries(modifier.add),
          remove: readStringEntries(modifier.remove),
        },
      });
    }
  }

  return filters;
}

function readBackends(rawBackends: unknown, namespace: string): BackendRef[] {
  if (!Array.isArray(rawBackends) || rawBackends.length === 0) {
    return [createEmptyBackendRef(namespace)];
  }

  return rawBackends.map((rawBackend) => {
    const backend =
      rawBackend && typeof rawBackend === "object" && !Array.isArray(rawBackend)
        ? (rawBackend as Record<string, unknown>)
        : {};

    return {
      name: String(backend.name ?? ""),
      namespace: String(backend.namespace ?? namespace),
      port: Number(backend.port ?? 80),
      weight: Number(backend.weight ?? 1),
    };
  });
}

function buildHeaderModifierLines(modifier: HeaderModifier, indent: string): string[] {
  const lines: string[] = [];

  if (modifier.set.length > 0) {
    lines.push(`${indent}set:`);
    for (const entry of modifier.set) {
      lines.push(`${indent}  - name: ${entry.name}`);
      lines.push(`${indent}    value: ${entry.value}`);
    }
  }

  if (modifier.add.length > 0) {
    lines.push(`${indent}add:`);
    for (const entry of modifier.add) {
      lines.push(`${indent}  - name: ${entry.name}`);
      lines.push(`${indent}    value: ${entry.value}`);
    }
  }

  const removeEntries = modifier.remove.filter((entry) => entry.trim());
  if (removeEntries.length > 0) {
    lines.push(`${indent}remove:`);
    for (const entry of removeEntries) {
      lines.push(`${indent}  - ${entry}`);
    }
  }

  return lines;
}

function buildRuleLines(rule: RouteRule): string[] {
  const lines = ["    - matches:", "        -"];
  const pathMatch = rule.pathMatch.trim() || "/";

  lines.push("          path:");
  lines.push("            type: PathPrefix");
  lines.push(`            value: ${pathMatch}`);

  if (rule.method && rule.method !== "__any__") {
    lines.push(`          method: ${rule.method}`);
  }

  const headerMatches = rule.headerMatches.filter((entry) => entry.name.trim());
  if (headerMatches.length > 0) {
    lines.push("          headers:");
    for (const entry of headerMatches) {
      lines.push(`            - type: ${entry.type}`);
      lines.push(`              name: ${entry.name}`);
      lines.push(`              value: ${entry.value}`);
    }
  }

  const queryParamMatches = rule.queryParamMatches.filter((entry) => entry.name.trim());
  if (queryParamMatches.length > 0) {
    lines.push("          queryParams:");
    for (const entry of queryParamMatches) {
      lines.push(`            - type: ${entry.type}`);
      lines.push(`              name: ${entry.name}`);
      lines.push(`              value: ${entry.value}`);
    }
  }

  if (rule.filters.length > 0) {
    lines.push("      filters:");
    for (const filter of rule.filters) {
      lines.push(`        - type: ${filter.type}`);
      const key =
        filter.type === "RequestHeaderModifier"
          ? "requestHeaderModifier"
          : "responseHeaderModifier";
      const modifierLines = buildHeaderModifierLines(filter.config, "            ");

      if (modifierLines.length > 0) {
        lines.push(`          ${key}:`);
        lines.push(...modifierLines);
      }
    }
  }

  if (rule.requestTimeout.trim()) {
    lines.push("      timeouts:");
    lines.push(`        request: ${rule.requestTimeout}`);
  }

  const backends = rule.backends.filter((backend) => backend.name.trim());
  if (backends.length === 0) {
    lines.push("      backendRefs: []");
    return lines;
  }

  lines.push("      backendRefs:");
  for (const backend of backends) {
    lines.push(`        - name: ${backend.name}`);
    lines.push(`          namespace: ${backend.namespace}`);
    lines.push(`          port: ${backend.port}`);
    lines.push(`          weight: ${backend.weight}`);
  }

  return lines;
}

export function createEmptyHTTPRouteFormData(): HTTPRouteFormData {
  return {
    name: "",
    namespace: "default",
    gatewayName: "",
    gatewayNamespace: "default",
    hostnames: "",
    rules: [createEmptyRule()],
  };
}

export function httpRouteResourceToFormData(
  resource: ManagedResource | KubernetesResource
): HTTPRouteFormData {
  const fallbackName =
    "name" in resource && typeof resource.name === "string" ? resource.name : "";
  const fallbackNamespace =
    "namespace" in resource && typeof resource.namespace === "string"
      ? resource.namespace
      : "default";
  const unwrapped = unwrapResource(resource) as ManifestRecord;
  const spec = (unwrapped.spec ?? {}) as Record<string, unknown>;
  const metadata = (unwrapped.metadata ?? {}) as Record<string, unknown>;
  const metadataNamespace = String(metadata.namespace ?? fallbackNamespace);
  const parentRefs = Array.isArray(spec.parentRefs) ? spec.parentRefs : [];
  const parentRef =
    parentRefs[0] && typeof parentRefs[0] === "object" && !Array.isArray(parentRefs[0])
      ? (parentRefs[0] as Record<string, unknown>)
      : {};

  const rules = Array.isArray(spec.rules)
    ? spec.rules.map((rawRule) => {
        const rule =
          rawRule && typeof rawRule === "object" && !Array.isArray(rawRule)
            ? (rawRule as Record<string, unknown>)
            : {};
        const matches = Array.isArray(rule.matches) ? rule.matches : [];
        const match =
          matches[0] && typeof matches[0] === "object" && !Array.isArray(matches[0])
            ? (matches[0] as Record<string, unknown>)
            : {};
        const path =
          match.path && typeof match.path === "object" && !Array.isArray(match.path)
            ? (match.path as Record<string, unknown>)
            : {};
        const timeouts =
          rule.timeouts && typeof rule.timeouts === "object" && !Array.isArray(rule.timeouts)
            ? (rule.timeouts as Record<string, unknown>)
            : {};

        return {
          pathMatch: String(path.value ?? "/"),
          method: String(match.method ?? ""),
          headerMatches: readHeaderMatches(match.headers),
          queryParamMatches: readQueryParamMatches(match.queryParams),
          filters: readFilters(rule.filters),
          requestTimeout: String(timeouts.request ?? ""),
          backends: readBackends(rule.backendRefs, metadataNamespace),
        };
      })
    : [];

  return {
    name: String(metadata.name ?? fallbackName),
    namespace: metadataNamespace,
    gatewayName: String(parentRef.name ?? ""),
    gatewayNamespace: String(parentRef.namespace ?? metadataNamespace),
    hostnames: Array.isArray(spec.hostnames) ? spec.hostnames.map(String).join(", ") : "",
    rules: rules.length > 0 ? rules : createEmptyHTTPRouteFormData().rules,
  };
}

export function httpRouteFormDataToManifest(formData: HTTPRouteFormData): string {
  const hostnameList = formData.hostnames
    .split(",")
    .map((hostname) => hostname.trim())
    .filter((hostname) => hostname);
  const rules = formData.rules.filter((rule) =>
    rule.backends.some((backend) => backend.name.trim())
  );
  const lines = [
    "apiVersion: gateway.networking.k8s.io/v1",
    "kind: HTTPRoute",
    "metadata:",
    `  name: ${formData.name}`,
    `  namespace: ${formData.namespace}`,
    "spec:",
    "  parentRefs:",
    `    - name: ${formData.gatewayName}`,
    `      namespace: ${formData.gatewayNamespace}`,
  ];

  if (hostnameList.length > 0) {
    lines.push("  hostnames:");
    for (const hostname of hostnameList) {
      lines.push(`    - ${hostname}`);
    }
  }

  if (rules.length === 0) {
    lines.push("  rules: []");
  } else {
    lines.push("  rules:");
    for (const rule of rules) {
      lines.push(...buildRuleLines(rule));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function httpRouteManifestToFormData(yamlText: string): HTTPRouteFormData {
  const manifest = parseSingleManifest(yamlText);
  assertManifestKind(manifest, "gateway.networking.k8s.io/v1", "HTTPRoute");
  readManifestIdentity(manifest);
  return httpRouteResourceToFormData(manifest as KubernetesResource);
}

export const httpRouteEditorCodec: ResourceEditorCodec<HTTPRouteFormData> = {
  apiVersion: "gateway.networking.k8s.io/v1",
  kind: "HTTPRoute",
  toYaml: httpRouteFormDataToManifest,
  fromYaml: httpRouteManifestToFormData,
  getIdentity: (formData) => ({
    name: formData.name,
    namespace: formData.namespace,
  }),
};
