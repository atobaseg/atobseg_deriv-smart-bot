import { Router, type IRouter } from "express";

import {
    db,
    usersTable,
} from "@workspace/db";

import { eq } from "drizzle-orm";

import { hashPassword } from "../lib/auth/password";
import { createSession } from "../lib/auth/sessions";

const router: IRouter = Router();

const SESSION_COOKIE_NAME = "deriv_session";

router.post("/auth/register", async (req, res) => {
    try {
        const email =
            typeof req.body?.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const password =
            typeof req.body?.password === "string"
                ? req.body.password
                : "";

        const name =
            typeof req.body?.name === "string"
                ? req.body.name.trim()
                : null;

        if (!email || !password) {
            res.status(400).json({
                error: "Email and password are required.",
            });
            return;
        }

        if (password.length < 8) {
            res.status(400).json({
                error: "Password must be at least 8 characters.",
            });
            return;
        }

        const existingUsers = await db
            .select({
                id: usersTable.id,
            })
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);

        if (existingUsers.length > 0) {
            res.status(409).json({
                error: "An account with this email already exists.",
            });
            return;
        }

        const passwordHash = await hashPassword(password);

        const [user] = await db
            .insert(usersTable)
            .values({
                email,
                passwordHash,
                name: name || null,
                isActive: true,
            })
            .returning({
                id: usersTable.id,
                email: usersTable.email,
                name: usersTable.name,
            });

        if (!user) {
            throw new Error("Failed to create user.");
        }

        const session = await createSession(user.id);

        res.cookie(
            SESSION_COOKIE_NAME,
            session.token,
            {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 1000 * 60 * 60 * 24 * 30,
                path: "/",
            },
        );

        res.status(201).json({
            user,
        });
    } catch (error) {
        console.error(
            "Registration failed:",
            error,
        );

        res.status(500).json({
            error: "Unable to create account.",
        });
    }
});

export default router;