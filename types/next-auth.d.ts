import type { DefaultSession } from "next-auth";
import "next-auth";
import "@auth/core/jwt";

declare module "next-auth" {
  interface User {
    token?: string;
  }
  interface Session {
    user: {
      token?: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
  }
}