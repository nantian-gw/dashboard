import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CONTROLPLANE_ADMIN_URL } from "@/lib/admin-urls";
import { createFixedWindowRateLimiter, type RateLimitResult } from "./rate-limit";

const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;
const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_ERROR_CODE_INVALID = "invalid";
const AUTH_ERROR_CODE_RATE_LIMITED = "rate_limited";
const AUTH_ERROR_CODE_NETWORK = "network";
const SUPPRESSED_AUTH_ERROR_CODES = new Set([
  "credentials",
  AUTH_ERROR_CODE_INVALID,
  AUTH_ERROR_CODE_RATE_LIMITED,
]);

type TokenVerificationResult = "valid" | "invalid" | "network_error";
type TokenVerificationOutcome =
  | { result: "valid" }
  | { result: "invalid" }
  | { result: "network_error"; error?: Error; responseStatus?: number };

const authRateLimiter = createFixedWindowRateLimiter({
  limit: AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
});

class InvalidCredentialsError extends CredentialsSignin {
  code = AUTH_ERROR_CODE_INVALID;
}

class RateLimitedCredentialsError extends CredentialsSignin {
  code = AUTH_ERROR_CODE_RATE_LIMITED;
}

class NetworkCredentialsError extends CredentialsSignin {
  code = AUTH_ERROR_CODE_NETWORK;

  constructor(cause?: Error, responseStatus?: number) {
    super("Controlplane token verification failed");

    const details: Record<string, unknown> = {};
    if (cause) {
      details.err = cause;
    }
    if (typeof responseStatus === "number") {
      details.responseStatus = responseStatus;
    }
    if (Object.keys(details).length > 0) {
      Object.defineProperty(this, "cause", {
        configurable: true,
        enumerable: false,
        value: details,
        writable: true,
      });
    }
  }
}

function firstForwardedForValue(value: string | null): string {
  return value
    ?.split(",")
    .map((part) => part.trim())
    .find(Boolean) ?? "";
}

function headerValue(value: string | null): string {
  return value?.trim() ?? "";
}

export function getAuthRateLimitKey(request?: Request): string {
  const forwardedFor = firstForwardedForValue(
    request?.headers.get("x-forwarded-for") ?? null
  );
  if (forwardedFor) return `ip:${forwardedFor}`;

  const realIp = headerValue(request?.headers.get("x-real-ip") ?? null);
  if (realIp) return `ip:${realIp}`;

  const cloudflareIp = headerValue(request?.headers.get("cf-connecting-ip") ?? null);
  if (cloudflareIp) return `ip:${cloudflareIp}`;

  return "ip:unknown";
}

export function checkAuthRateLimit(request?: Request): RateLimitResult {
  return authRateLimiter.check(getAuthRateLimitKey(request));
}

export function resetAuthRateLimitForTests(): void {
  authRateLimiter.reset();
}

function isSuppressedCredentialsError(error: Error): error is CredentialsSignin {
  return (
    error instanceof CredentialsSignin &&
    SUPPRESSED_AUTH_ERROR_CODES.has(error.code)
  );
}

function createNetworkCredentialsError(
  outcome: Extract<TokenVerificationOutcome, { result: "network_error" }>
): NetworkCredentialsError {
  if (typeof outcome.responseStatus === "number") {
    return new NetworkCredentialsError(
      new Error(
        `Controlplane token verification returned HTTP ${outcome.responseStatus}`
      ),
      outcome.responseStatus
    );
  }

  return new NetworkCredentialsError(outcome.error);
}

export function logAuthError(error: Error): void {
  if (isSuppressedCredentialsError(error)) return;

  const name = error instanceof CredentialsSignin ? error.type : error.name;
  console.error(`[auth][error] ${name}: ${error.message}`);

  const cause = (error as Error & { cause?: unknown }).cause;
  if (
    cause &&
    typeof cause === "object" &&
    "err" in cause &&
    cause.err instanceof Error
  ) {
    const { err, ...data } = cause as { err: Error } & Record<string, unknown>;
    console.error("[auth][cause]:", err.stack);
    if (Object.keys(data).length > 0) {
      console.error("[auth][details]:", JSON.stringify(data, null, 2));
    }
    return;
  }

  if (error.stack) {
    // Log the stack without its first line; the name/message is logged above.
    const stackBody = error.stack.split("\n").slice(1).join("\n");
    if (stackBody) console.error(stackBody);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        token: { label: "Token", type: "text" },
      },
      authorize: async (credentials, request) => {
        const token = (credentials?.token as string)?.trim();
        if (!token) return null;

        const rateLimit = checkAuthRateLimit(request);
        if (!rateLimit.allowed) throw new RateLimitedCredentialsError();

        const verification = await verifyTokenAgainstControlplaneDetailed(token);
        if (verification.result === "invalid") {
          throw new InvalidCredentialsError();
        }
        if (verification.result === "network_error") {
          throw createNetworkCredentialsError(verification);
        }

        return {
          id: "admin",
          name: "Admin",
          email: "admin@nantian-gw",
          token,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/en/login",
  },
  logger: {
    error: logAuthError,
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.token) {
        token.accessToken = user.token;
        token.expiresAt = Date.now() + 3600 * 1000; // 1 hour from login
      }
      if (
        token.expiresAt &&
        Date.now() > (token.expiresAt as number) - 300_000
      ) {
        token = await refreshAccessToken(token);
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.accessToken) {
        session.user.token = token.accessToken;
      }
      return session;
    },
  },
  session: {
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 30 * 60, // 30 minutes
  },
});

async function verifyTokenAgainstControlplaneDetailed(
  token: string
): Promise<TokenVerificationOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `${CONTROLPLANE_ADMIN_URL}/v1/summary`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }
    );

    if (response.ok) {
      // Ensure the response actually came from an authenticated context.
      // noAuthHandler allows all GET requests, so a 200 doesn't prove token validity.
      const body = await response.clone().json().catch(() => null);
      if (body && typeof body === "object" && "snapshotVersion" in body) {
        return { result: "valid" as const };
      }
      // If the response is not the expected summary shape, treat as auth not configured.
      return { result: "network_error", responseStatus: 0 };
    }
    if (response.status === 401 || response.status === 403) {
      return { result: "invalid" };
    }

    return {
      result: "network_error",
      responseStatus: response.status,
    };
  } catch (error) {
    return {
      result: "network_error",
      error:
        error instanceof Error
          ? error
          : new Error("Controlplane token verification failed"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshAccessToken(token: import("@auth/core/jwt").JWT): Promise<import("@auth/core/jwt").JWT> {
  if (!token.accessToken) return token;

  const verification = await verifyTokenAgainstControlplaneDetailed(
    token.accessToken as string
  );

  if (verification.result === "valid") {
    token.expiresAt = Date.now() + 3600 * 1000;
  }
  // If invalid or network error, keep existing token (session will expire naturally)

  return token;
}

export async function verifyTokenAgainstControlplane(
  token: string
): Promise<TokenVerificationResult> {
  const verification = await verifyTokenAgainstControlplaneDetailed(token);
  return verification.result;
}
