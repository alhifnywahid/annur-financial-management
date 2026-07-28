import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";
import * as schema from "#/db/schema";

/**
 * Allow-list gate. In the old app this was the NextAuth `signIn` callback that
 * compared `user.email === process.env.EMAIL`. We keep the exact same behavior:
 * only the configured admin email may sign in.
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
            // Reject sign-in for any account that is not the admin email.
            throw new Error("Email tidak diizinkan untuk masuk.");
          }
          return { data: user };
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
});
