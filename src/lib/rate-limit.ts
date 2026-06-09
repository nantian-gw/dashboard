export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export type FixedWindowRateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export type FixedWindowRateLimiter = {
  check: (key: string) => RateLimitResult;
  reset: (key?: string) => void;
  size: () => number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

function normalizeKey(key: string): string {
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
}

function assertPositiveInteger(value: number, name: "limit" | "windowMs") {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

export function createFixedWindowRateLimiter(
  options: FixedWindowRateLimiterOptions
): FixedWindowRateLimiter {
  assertPositiveInteger(options.limit, "limit");
  assertPositiveInteger(options.windowMs, "windowMs");

  const limit = options.limit;
  const windowMs = options.windowMs;
  const buckets = new Map<string, Bucket>();
  const getNow = options.now ?? Date.now;
  let nextPruneAt = Number.POSITIVE_INFINITY;

  function trackNextPruneAt(resetAt: number) {
    if (resetAt < nextPruneAt) {
      nextPruneAt = resetAt;
    }
  }

  function recomputeNextPruneAt() {
    let next = Number.POSITIVE_INFINITY;
    for (const bucket of buckets.values()) {
      if (bucket.resetAt < next) {
        next = bucket.resetAt;
      }
    }
    nextPruneAt = next;
  }

  function getBucket(key: string, current: number): Bucket {
    const existing = buckets.get(key);
    if (existing && existing.resetAt > current) {
      return existing;
    }

    const bucket = {
      count: 0,
      resetAt: current + windowMs,
    };
    buckets.set(key, bucket);
    trackNextPruneAt(bucket.resetAt);
    return bucket;
  }

  function pruneExpired(current: number) {
    let next = Number.POSITIVE_INFINITY;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= current) {
        buckets.delete(key);
        continue;
      }

      if (bucket.resetAt < next) {
        next = bucket.resetAt;
      }
    }
    nextPruneAt = next;
  }

  return {
    check(key) {
      const current = getNow();
      if (current >= nextPruneAt) {
        pruneExpired(current);
      }
      const bucket = getBucket(normalizeKey(key), current);

      if (bucket.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: bucket.resetAt,
        };
      }

      bucket.count += 1;

      return {
        allowed: true,
        remaining: Math.max(limit - bucket.count, 0),
        resetAt: bucket.resetAt,
      };
    },
    reset(key) {
      if (key === undefined) {
        buckets.clear();
        nextPruneAt = Number.POSITIVE_INFINITY;
        return;
      }

      const normalizedKey = normalizeKey(key);
      const bucket = buckets.get(normalizedKey);
      buckets.delete(normalizedKey);
      if (bucket?.resetAt === nextPruneAt) {
        recomputeNextPruneAt();
      }
    },
    size() {
      pruneExpired(getNow());
      return buckets.size;
    },
  };
}
