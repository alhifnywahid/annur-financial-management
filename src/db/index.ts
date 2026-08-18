import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "#/env";
import * as schema from "./schema.ts";

// Via the validated `env` so a missing/blank DATABASE_URL fails at startup with
// a clear message, instead of `pg` falling back to libpq defaults and trying to
// connect to a local Postgres that isn't there.
const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export { schema };
