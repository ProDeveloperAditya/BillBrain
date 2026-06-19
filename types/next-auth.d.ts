import type { DefaultSession } from "next-auth";

// Augment the built-in Session type to include the user's DB id.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
