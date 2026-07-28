import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Domain tables (migrated from MongoDB, normalized)                          */
/* -------------------------------------------------------------------------- */

/**
 * Anggota / member master list. Mirrors the old `DataUser` collection.
 */
export const dataUser = pgTable("data_user", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
});

/**
 * One record per month. Replaces the old `DataBulanan.tanggal` ("MMYYYY"
 * string) with explicit integer `bulan`/`tahun` columns so sorting and
 * filtering are correct.
 */
export const dataBulanan = pgTable(
  "data_bulanan",
  {
    id: serial("id").primaryKey(),
    bulan: integer("bulan").notNull(), // 1-12
    tahun: integer("tahun").notNull(),
  },
  (t) => ({
    bulanTahunUnique: unique("data_bulanan_bulan_tahun_unique").on(
      t.bulan,
      t.tahun,
    ),
  }),
);

/**
 * The bills attached to a month (was the embedded `pembayaran[]` array).
 */
export const pembayaran = pgTable("pembayaran", {
  id: serial("id").primaryKey(),
  dataBulananId: integer("data_bulanan_id")
    .notNull()
    .references(() => dataBulanan.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  nominal: integer("nominal").notNull(),
});

/**
 * Per-user payment state for a given month (was the embedded `user[]` array).
 */
export const bulananUser = pgTable("bulanan_user", {
  id: serial("id").primaryKey(),
  dataBulananId: integer("data_bulanan_id")
    .notNull()
    .references(() => dataBulanan.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  totalBayar: integer("total_bayar").notNull().default(0),
});

/**
 * Late months for a user (was the embedded `denda: [String]` array of
 * "MMYYYY" values). Normalized into explicit bulan/tahun rows.
 */
export const denda = pgTable("denda", {
  id: serial("id").primaryKey(),
  bulananUserId: integer("bulanan_user_id")
    .notNull()
    .references(() => bulananUser.id, { onDelete: "cascade" }),
  bulan: integer("bulan").notNull(), // 1-12
  tahun: integer("tahun").notNull(),
});

/**
 * Extra income. Old `tanggal` "DDMMYYYY" string is now a real `date`.
 */
export const dataPemasukan = pgTable("data_pemasukan", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  nominal: integer("nominal").notNull(),
  tanggal: date("tanggal", { mode: "date" }).notNull(),
});

/**
 * Extra expense. Old `tanggal` "DDMMYYYY" string is now a real `date`.
 */
export const dataPengeluaran = pgTable("data_pengeluaran", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  nominal: integer("nominal").notNull(),
  tanggal: date("tanggal", { mode: "date" }).notNull(),
});

/* -------------------------------------------------------------------------- */
/*  Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const dataBulananRelations = relations(dataBulanan, ({ many }) => ({
  pembayaran: many(pembayaran),
  user: many(bulananUser),
}));

export const pembayaranRelations = relations(pembayaran, ({ one }) => ({
  dataBulanan: one(dataBulanan, {
    fields: [pembayaran.dataBulananId],
    references: [dataBulanan.id],
  }),
}));

export const bulananUserRelations = relations(bulananUser, ({ one, many }) => ({
  dataBulanan: one(dataBulanan, {
    fields: [bulananUser.dataBulananId],
    references: [dataBulanan.id],
  }),
  denda: many(denda),
}));

export const dendaRelations = relations(denda, ({ one }) => ({
  bulananUser: one(bulananUser, {
    fields: [denda.bulananUserId],
    references: [bulananUser.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*  Better Auth tables                                                         */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});
