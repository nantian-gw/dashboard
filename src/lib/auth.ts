import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CONTROLPLANE_ADMIN_URL } from "@/lib/admin-urls";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        token: { label: "Token", type: "text" },
      },
      authorize: async (credentials) => {
        const token = (credentials?.token as string)?.trim();
        if (!token) return null;

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
