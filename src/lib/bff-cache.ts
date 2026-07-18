/**
 * BFF-layer in-memory TTL cache for controlplane/dataplane API aggregation.
 *
 * Caches GET responses for 5 seconds with simple LRU eviction at 100 entries.
 * Reduces redundant upstream fetches during dashboard page loads where the
 * same aggregated views are requested by multiple components.
 */

interface CacheEntry {
  data: CachedResponse;
  expires: number;
}

export interface CachedResponse {
  body: string | null;
  status: number;
  headers: Record<string, string>;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5000; // 5 seconds
const MAX_ENTRIES = 100;

export function getCached(key: string): CachedResponse | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

export function setCache(key: string, data: CachedResponse, ttl = DEFAULT_TTL): void {
  cache.set(key, { data, expires: Date.now() + ttl });
  // Simple LRU: evict oldest entry when cache grows too large.
  if (cache.size > MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

/**
 * Build a cache key from pathname + search params.
 * Mutations (POST/PUT/PATCH/DELETE) should never call this.
 */
export function buildCacheKey(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}
