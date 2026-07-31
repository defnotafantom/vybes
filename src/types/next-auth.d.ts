import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      slug: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
    slug?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    slug?: string;
  }
}
