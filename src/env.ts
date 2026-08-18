import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().url(),
		BETTER_AUTH_URL: z.string().url().optional(),
		BETTER_AUTH_SECRET: z.string().min(1),
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
		ADMIN_EMAIL: z.string().email(),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {},

	/**
	 * What object holds the environment variables at runtime. On the server we
	 * read from `process.env`; client vars are statically replaced by Vite.
	 */
	runtimeEnv: process.env,

	/**
	 * Treat empty strings as undefined so missing `.env` values fail validation
	 * instead of silently passing as "".
	 */
	emptyStringAsUndefined: true,

	/**
	 * Skip validation during the data-migration script / build steps where not
	 * every var is present.
	 */
	skipValidation:
		!!process.env.SKIP_ENV_VALIDATION || process.env.NODE_ENV === "test",
});
