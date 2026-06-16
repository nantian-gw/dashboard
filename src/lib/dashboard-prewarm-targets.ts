import { routing } from "@/i18n/routing";

export type DashboardQueryPrewarmTarget =
  | { kind: "gateways-list" }
  | { kind: "gateway-detail"; namespace: string; name: string }
  | { kind: "routes-list" }
  | { kind: "route-detail"; routeKind: string; namespace: string; name: string }
  | { kind: "backend-tls-list" }
  | { kind: "reference-grants-list" }
  | { kind: "reference-grant-detail"; namespace: string; name: string }
  | { kind: "ai-services-list" }
  | { kind: "token-policies-list" };

const localeSet = new Set(routing.locales);

function stripSearchAndHash(href: string): string {
  return href.split(/[?#]/, 1)[0] || href;
}

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  const [first, ...rest] = segments;
  if (localeSet.has(first as (typeof routing.locales)[number])) {
    return `/${rest.join("/")}`;
  }

  return pathname;
}

export function getDashboardQueryPrewarmTargets(href: string): DashboardQueryPrewarmTarget[] {
  const dashboardPath = stripLocalePrefix(stripSearchAndHash(href));
  const segments = dashboardPath.split("/").filter(Boolean);

  if (segments[0] === "gateways") {
    if (segments.length === 1) return [{ kind: "gateways-list" }];
    if (segments.length === 3 && segments[1] !== "create") {
      return [{ kind: "gateway-detail", namespace: segments[1], name: segments[2] }];
    }
    return [];
  }

  if (segments[0] === "routes") {
    if (segments.length === 1) return [{ kind: "routes-list" }];
    if (segments[1] === "create") return [];
    if (segments.length === 4) {
      return [
        {
          kind: "route-detail",
          routeKind: segments[1],
          namespace: segments[2],
          name: segments[3],
        },
      ];
    }
    return [];
  }

  if (segments[0] === "backend-tls") {
    if (segments.length === 1) return [{ kind: "backend-tls-list" }];
    if (segments[1] === "create") return [];
    if (segments.length === 3) return [{ kind: "backend-tls-list" }];
    return [];
  }

  if (segments[0] === "reference-grants") {
    if (segments.length === 1) return [{ kind: "reference-grants-list" }];
    if (segments[1] === "create") return [];
    if (segments.length === 3) {
      return [{ kind: "reference-grant-detail", namespace: segments[1], name: segments[2] }];
    }
    return [];
  }

  if (segments[0] === "ai" && segments[1] === "services") {
    if (segments.length === 2) return [{ kind: "ai-services-list" }];
    if (segments.length === 3 && segments[2] !== "create") return [{ kind: "ai-services-list" }];
    return [];
  }

  if (segments[0] === "ai" && segments[1] === "token-policies") {
    if (segments.length === 2) return [{ kind: "token-policies-list" }];
    return [];
  }

  return [];
}
