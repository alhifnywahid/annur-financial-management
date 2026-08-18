import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db";
import * as schema from "#/db/schema";
import { env } from "#/env";

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
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					// Allow-list gate, ported from the old NextAuth `signIn` callback:
					// only the configured admin email may create an account. Compared
					// unconditionally — the old `ADMIN_EMAIL && ...` form silently let
					// everyone in whenever the variable was missing.
					if (user.email !== env.ADMIN_EMAIL) {
						throw new Error("Email tidak diizinkan untuk masuk.");
					}
					return { data: user };
				},
			},
		},
	},
	plugins: [tanstackStartCookies()],
});
