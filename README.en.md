<p align="center">
  <img src="./assets/readme/hero.svg" alt="Annur Official — dormitory financial management built with TanStack Start, Neon Postgres, Drizzle, and Better Auth" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TanStack_Start-1E3932?style=flat-square&logo=react&logoColor=white" alt="TanStack Start" />
  <img src="https://img.shields.io/badge/React_19-006241?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Neon_Postgres-00754A?style=flat-square&logo=postgresql&logoColor=white" alt="Neon Postgres" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-1E3932?style=flat-square&logo=drizzle&logoColor=white" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Better_Auth-00754A?style=flat-square" alt="Better Auth" />
  <img src="https://img.shields.io/badge/Tailwind_v4-006241?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/License-MIT-cba258?style=flat-square" alt="MIT License" />
</p>

<p align="center">
  <a href="./README.md">Bahasa Indonesia</a> &#183; <b>English</b>
</p>

---

**Annur Official** is a web app for managing the finances of a dormitory or small community: recording each member's monthly dues, tracking cash in and out, and following payment and debt status, all in one place. Members can check their own bills, while treasurers manage everything through an admin panel.

This release (**v2**) is a full migration from Next.js + MongoDB to **TanStack Start + Neon Postgres + Drizzle + Better Auth**, keeping the original look and flow intact.

## Features

### For Members
- Summary of bills due for the current month
- History of cash income and expenses
- Per-member payment and debt status, by month
- Online payment guide via **QRIS**
- Offline payment guide via **WhatsApp**

### For Admins
- Manage income and expense records (add, edit, delete)
- Manage monthly bills (required dues components)
- Manage members, including **add, rename, and delete**
- Recap and monitor payment data across all members
- Admin access is gated by email (`ADMIN_EMAIL`) via Google OAuth

## Architecture

<p align="center">
  <img src="./assets/readme/architecture.svg" alt="Architecture diagram: React 19 browser calls TanStack Start (SSR and server functions), which reaches Neon Postgres through Drizzle ORM; Better Auth handles Google OAuth; legacy MongoDB data is moved once via the migrate-data.ts script" width="100%" />
</p>

The React 19 UI runs on **TanStack Start**, which provides both SSR and *server functions*, so there is no separate REST API layer. Data access goes through the type-safe **Drizzle ORM** to **Neon Postgres** (serverless). Authentication is handled by **Better Auth** with Google OAuth. Data from the legacy app (MongoDB) is moved once via the ETL script `scripts/migrate-data.ts`.

## Tech Stack

| Category | Technology |
|---|---|
| Framework | TanStack Start (React 19), TanStack Router / Query / Form / Store / Table |
| Database | Neon Postgres (serverless) |
| ORM & Migrations | Drizzle ORM + drizzle-kit |
| Authentication | Better Auth (Google OAuth) |
| Styling | Tailwind CSS v4, Radix UI |
| Icons | Lucide React, React Icons |
| Validation | Zod, `@t3-oss/env-core` |
| Tooling | Vite, Biome (lint & format), Vitest |
| Language | TypeScript |

## Project Structure

```
annur-financial-management/
├── assets/readme/            # README visual assets (hero, architecture)
├── db/
│   └── init.sql              # Initial SQL schema bootstrap
├── public/                   # Static assets (logo, QRIS, favicon, manifest)
├── scripts/
│   ├── migrate-data.ts       # One-time ETL: MongoDB -> Neon Postgres
│   └── verify-migration.ts   # Verify Postgres matches the Mongo source
├── src/
│   ├── components/           # UI components (admin/, ui/, cards, header)
│   ├── db/                   # Drizzle connection + schema (schema.ts)
│   ├── integrations/         # TanStack setup (Query, devtools)
│   ├── lib/                  # server functions, data access, utils, config
│   ├── routes/               # File-based routes (_user/, admin/)
│   ├── env.ts                # Environment variable validation
│   ├── router.tsx            # Router configuration
│   └── styles.css            # Global styles (Tailwind theme)
├── drizzle.config.ts         # Drizzle Kit configuration
├── vite.config.ts            # Vite configuration
└── biome.json                # Biome configuration
```

## Prerequisites

- **Node.js** version 20 or newer
- A **Neon Postgres** database (or another Postgres instance)
- A **Google Cloud** account for OAuth credentials

## Installation and Usage

**1. Clone the repository**

```bash
git clone https://github.com/alhifnywahid/annur-financial-management.git
cd annur-financial-management
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up the environment**

Copy `.env.example` to `.env.local`, then fill in the values (see [Environment Configuration](#environment-configuration)).

```bash
cp .env.example .env.local
```

**4. Set up the database schema**

```bash
npm run db:push
```

**5. Run the development server**

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

**6. Build for production**

```bash
npm run build
npm run preview
```

## Environment Configuration

Create a `.env.local` file in the project root with the following variables:

```env
# Database (Neon Postgres)
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
# Generate with: npx -y @better-auth/cli secret
BETTER_AUTH_SECRET=

# Google OAuth (Google Cloud Console)
# Authorized redirect URI: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email allowed to access the admin panel
ADMIN_EMAIL=admin@gmail.com
```

### Obtaining Google OAuth credentials
1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Google Identity**
4. Create an **OAuth 2.0 Client ID** under Credentials
5. Add `http://localhost:3000/api/auth/callback/google` to the **Authorized redirect URIs**

## Data Migration (optional, one-time)

If you are moving data from the legacy app (MongoDB), add `MONGO_URI` to `.env.local`, then run:

```bash
npm run migrate:data      # import MongoDB -> Neon Postgres
npm run verify:migration  # confirm the result matches the source
```

Remove `MONGO_URI` when done. The `db:generate`, `db:migrate`, and `db:studio` commands are also available for managing the Drizzle schema.

## Versions

| Version | Stack | Reference |
|---|---|---|
| **v2** (current) | TanStack Start + Neon Postgres + Drizzle + Better Auth | branch `main` |
| **v1** | Next.js 14 + MongoDB + NextAuth | tag [`v1-nextjs`](https://github.com/alhifnywahid/annur-financial-management/releases) |

Both versions live in the same repository, so you can deploy from either tag.

## Contributing

Contributions are welcome. Fork the repository, create a feature branch (`git checkout -b feature/feature-name`), commit your changes, then open a Pull Request.

## License

Released under the [MIT License](./LICENSE).
