type JsonObject = Record<string, unknown>;

export type GlobalSearchKind =
  | "gateway"
  | "route"
  | "referenceGrant"
  | "backendTls"
  | "node"
  | "diagnostic";

export type GlobalSearchItem = {
  kind: GlobalSearchKind;
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
};

export type GlobalSearchSources = {
  gateways?: unknown;
  routes?: unknown;
  referenceGrants?: unknown;
  backendTlsPolicies?: unknown;
  nodes?: unknown;
  diagnostics?: unknown;
};

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function compact(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function arrayFromPayload(payload: unknown, key: string): unknown[] {
  const data = asObject(payload);
  const nested = asArray(data[key]);
  return nested.length > 0 ? nested : asArray(payload);
}

function objectSummary(value: unknown): string {
  const data = asObject(value);
  return compact(Object.values(data).map((item) => asString(item))).join(" ");
}

function grantSpecSummary(grant: JsonObject): string {
  const resource = asObject(grant.resource);
  const spec = asObject(resource.spec || grant.spec);
  const from = asArray(spec.from)
    .map((item) => {
      const data = asObject(item);
      return compact([asString(data.kind), asString(data.namespace)]).join(" ");
    })
    .join(" ");
  const to = asArray(spec.to)
    .map((item) => {
      const data = asObject(item);
      return compact([asString(data.kind), asString(data.name)]).join(" ");
    })
    .join(" ");
  return compact([from, to]).join(" ");
}

function addItem(items: GlobalSearchItem[], item: GlobalSearchItem) {
  if (!item.title) return;
  items.push({ ...item, keywords: compact(item.keywords) });
}

export function buildGlobalSearchItems(sources: GlobalSearchSources): GlobalSearchItem[] {
  const items: GlobalSearchItem[] = [];

  for (const value of arrayFromPayload(sources.gateways, "gateways")) {
    const gateway = asObject(value);
    const name = asString(gateway.name);
    const namespace = asString(gateway.namespace);
    addItem(items, {
      kind: "gateway",
      title: name,
      subtitle: compact([namespace, asString(gateway.status), asString(gateway.address)]).join(" · "),
      href: `/gateways/${namespace}/${name}`,
      keywords: [name, namespace, asString(gateway.gatewayClass), asString(gateway.address), asString(gateway.status)],
    });
  }

  for (const value of arrayFromPayload(sources.routes, "routes")) {
    const route = asObject(value);
    const kind = asString(route.kind);
    const name = asString(route.name);
    const namespace = asString(route.namespace);
    const hostnames = asArray(route.hostnames).map((hostname) => asString(hostname)).join(" ");
    addItem(items, {
      kind: "route",
      title: name,
      subtitle: compact([kind, namespace, asString(route.status), asString(route.backend)]).join(" · "),
      href: `/routes/${kind}/${namespace}/${name}`,
      keywords: [name, namespace, kind, asString(route.parent), asString(route.backend), asString(route.status), hostnames],
    });
  }

  for (const value of arrayFromPayload(sources.referenceGrants, "grants")) {
    const grant = asObject(value);
    const name = asString(grant.name);
    const namespace = asString(grant.namespace);
    const specSummary = grantSpecSummary(grant);
    addItem(items, {
      kind: "referenceGrant",
      title: name,
      subtitle: compact([namespace, specSummary]).join(" · "),
      href: `/reference-grants/${namespace}/${name}`,
      keywords: [name, namespace, specSummary],
    });
  }

  for (const value of arrayFromPayload(sources.backendTlsPolicies, "policies")) {
    const policy = asObject(value);
    const name = asString(policy.name);
    const namespace = asString(policy.namespace);
    addItem(items, {
      kind: "backendTls",
      title: name,
      subtitle: compact([namespace, asString(policy.status), objectSummary(policy.targetRef)]).join(" · "),
      href: "/backend-tls",
      keywords: [name, namespace, asString(policy.status), objectSummary(policy.targetRef), asString(policy.caCertificate)],
    });
  }

  for (const value of arrayFromPayload(sources.nodes, "nodes")) {
    const node = asObject(value);
    const name = asString(node.name);
    addItem(items, {
      kind: "node",
      title: name,
      subtitle: compact([asString(node.ready), asString(node.ackState), asString(node.snapshotVersion)]).join(" · "),
      href: "/nodes",
      keywords: [name, asString(node.ready), asString(node.ackState), asString(node.snapshotVersion)],
    });
  }

  for (const value of arrayFromPayload(sources.diagnostics, "issues")) {
    const issue = asObject(value);
    const title = asString(issue.title);
    addItem(items, {
      kind: "diagnostic",
      title,
      subtitle: compact([asString(issue.severity), asString(issue.source), asString(issue.resource)]).join(" · "),
      href: "/diagnostics",
      keywords: [title, asString(issue.severity), asString(issue.description), asString(issue.source), asString(issue.resource)],
    });
  }

  return items;
}

function scoreItem(item: GlobalSearchItem, query: string): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;

  const title = item.title.toLowerCase();
  if (title === normalizedQuery) return 100;
  if (title.startsWith(normalizedQuery)) return 80;
  if (title.includes(normalizedQuery)) return 60;

  const subtitle = item.subtitle.toLowerCase();
  if (subtitle.includes(normalizedQuery)) return 40;

  return item.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery)) ? 20 : 0;
}

export function filterGlobalSearchItems(
  items: GlobalSearchItem[],
  query: string,
  limit = 8
): GlobalSearchItem[] {
  return items
    .map((item, index) => ({ item, index, score: scoreItem(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}
