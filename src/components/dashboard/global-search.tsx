"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useGlobalSearch } from "@/hooks/use-api/use-global-search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { searchAtom } from "@/lib/store";
import {
  type GlobalSearchItem,
  type GlobalSearchKind,
} from "@/lib/global-search";

const kindOrder: GlobalSearchKind[] = [
  "gateway",
  "route",
  "referenceGrant",
  "backendTls",
  "node",
  "diagnostic",
];

type IndexedSearchItem = {
  item: GlobalSearchItem;
  index: number;
};

function groupResults(items: IndexedSearchItem[]): Record<GlobalSearchKind, IndexedSearchItem[]> {
  return kindOrder.reduce<Record<GlobalSearchKind, IndexedSearchItem[]>>(
    (groups, kind) => {
      groups[kind] = items.filter(({ item }) => item.kind === kind);
      return groups;
    },
    {
      gateway: [],
      route: [],
      referenceGrant: [],
      backendTls: [],
      node: [],
      diagnostic: [],
    }
  );
}

export function GlobalSearch() {
  const t = useTranslations();
  const router = useRouter();
  const listboxId = useId();
  const [search, setSearch] = useAtom(searchAtom);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = search.trim();
  const shouldFetch = open && query.length > 0;

  const { data: results = [], isLoading } = useGlobalSearch(query, shouldFetch);

  const indexedResults = useMemo(
    () => results.map((item, index) => ({ item, index })),
    [results]
  );
  const grouped = useMemo(() => groupResults(indexedResults), [indexedResults]);
  const showPanel = open && query.length > 0;
  const selectedIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  function openResult(href: string) {
    setOpen(false);
    setSearch("");
    router.push(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (results.length === 0 ? 0 : Math.min(index + 1, results.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(results.length - 1, 0));
      return;
    }
    if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      openResult(results[selectedIndex]?.href ?? results[0].href);
    }
  }

  return (
    <div
      className="relative w-72"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        setOpen(false);
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        aria-controls="global-search-results"
        aria-activedescendant={showPanel && results[selectedIndex] ? `${listboxId}-${selectedIndex}` : undefined}
        aria-expanded={showPanel}
        aria-label={t("topbar.search_label")}
        className="pl-8"
        placeholder={t("topbar.search_placeholder")}
        role="combobox"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute right-0 top-11 z-50 max-h-[28rem] w-[28rem] overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl"
        >
          {isLoading ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("topbar.search_loading")}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("topbar.search_empty")}
            </div>
          ) : (
            kindOrder.map((kind) => {
              const group = grouped[kind];
              if (group.length === 0) return null;
              return (
                <section key={kind} className="py-1">
                  <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(`topbar.search_groups.${kind}`)}
                  </div>
                  <div className="space-y-1">
                    {group.map(({ item, index }) => (
                      <button
                        key={`${item.kind}-${item.href}-${item.title}-${index}`}
                        id={`${listboxId}-${index}`}
                        aria-selected={index === selectedIndex}
                        role="option"
                        type="button"
                        className="flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-selected:bg-accent"
                        onClick={() => openResult(item.href)}
                        onMouseDown={(event) => event.preventDefault()}
                      >
                        <Badge variant="outline" className="mt-0.5 shrink-0">
                          {t(`topbar.search_badges.${item.kind}`)}
                        </Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.subtitle || item.href}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
