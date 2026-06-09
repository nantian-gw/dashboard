import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CONTROLPLANE_ADMIN_URL } from "@/lib/admin-urls";
import { createFixedWindowRateLimiter, type RateLimitResult } from "./rate-limit";

const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 10;
const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;

const authRateLimiter = createFixedWindowRateLimiter({
  limit: AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
});

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
        if (!rateLimit.allowed) return null;

        const valid = await verifyTokenAgainstControlplane(token);
        if (!valid) return null;

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
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.token) {
        token.accessToken = user.token;
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
});

export async function verifyTokenAgainstControlplane(token: string): Promise<boolean> {
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

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
