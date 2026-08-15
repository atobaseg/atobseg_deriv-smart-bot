import {
    boolean,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";


//--------------------------------------------------
// Users
//--------------------------------------------------


export const usersTable = pgTable("users", {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    email: text("email")
        .notNull()
        .unique(),

    passwordHash: text("password_hash")
        .notNull(),

    name: text("name"),

    isActive: boolean("is_active")
        .notNull()
        .default(true),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),
});


//--------------------------------------------------
// Login Sessions
//--------------------------------------------------

export const sessionsTable = pgTable("sessions", {
    id: uuid("id")
        .defaultRandom()
        .primaryKey(),

    userId: uuid("user_id")
        .notNull()
        .references(
            () => usersTable.id,
            {
                onDelete: "cascade",
            }
        ),

    tokenHash: text("token_hash")
        .notNull()
        .unique(),

    expiresAt: timestamp("expires_at", {
        withTimezone: true,
    })
        .notNull(),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .notNull()
        .defaultNow(),
});


//--------------------------------------------------
// Deriv Credentials
//--------------------------------------------------

export const derivCredentialsTable = pgTable(
    "deriv_credentials",
    {
        id: uuid("id")
            .defaultRandom()
            .primaryKey(),

        userId: uuid("user_id")
            .notNull()
            .references(
                () => usersTable.id,
                {
                    onDelete: "cascade",
                }
            )
            .unique(),

        /*
         * These values must be encrypted before being
         * written to the database.
         *
         * We deliberately do NOT store raw Deriv
         * credentials here.
         */

        appIdEncrypted: text("app_id_encrypted")
            .notNull(),

        demoTokenEncrypted: text("demo_token_encrypted"),

        realTokenEncrypted: text("real_token_encrypted"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    }
);


//--------------------------------------------------
// Insert Types
//--------------------------------------------------

export type User =
    typeof usersTable.$inferSelect;

export type InsertUser =
    typeof usersTable.$inferInsert;


export type Session =
    typeof sessionsTable.$inferSelect;

export type InsertSession =
    typeof sessionsTable.$inferInsert;


export type DerivCredentials =
    typeof derivCredentialsTable.$inferSelect;

export type InsertDerivCredentials =
    typeof derivCredentialsTable.$inferInsert;