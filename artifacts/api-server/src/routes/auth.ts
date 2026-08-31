import { Router, type IRouter } from "express";

import {
    db,
    usersTable,
} from "@workspace/db";

import { eq } from "drizzle-orm";

import { hashPassword, verifyPassword } from "../lib/auth/password";
import {
    createSession,
    getSession,
    deleteSession,
} from "../lib/auth/sessions";

const router: IRouter = Router();

const SESSION_COOKIE_NAME = "deriv_session";

const SESSION_COOKIE_MAX_AGE =
    1000 *
    60 *
    60 *
    24 *
    30;

//--------------------------------------------------
// Register
//--------------------------------------------------

router.post(
    "/auth/register",
    async (req, res) => {

        try {

            const email =
                typeof req.body?.email === "string"
                    ? req.body.email
                        .trim()
                        .toLowerCase()
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
                    error:
                        "Email and password are required.",
                });

                return;
            }


            if (password.length < 8) {

                res.status(400).json({
                    error:
                        "Password must be at least 8 characters.",
                });

                return;
            }


            const existingUsers =
                await db
                    .select({
                        id: usersTable.id,
                    })
                    .from(usersTable)
                    .where(
                        eq(
                            usersTable.email,
                            email,
                        ),
                    )
                    .limit(1);


            if (existingUsers.length > 0) {

                res.status(409).json({
                    error:
                        "An account with this email already exists.",
                });

                return;
            }


            const passwordHash =
                await hashPassword(password);


            const [user] =
                await db
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

                throw new Error(
                    "Failed to create user.",
                );
            }


            const session =
                await createSession(user.id);


            res.cookie(
                SESSION_COOKIE_NAME,
                session.token,
                {
                    httpOnly: true,
                    secure:
                        process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge:
                        SESSION_COOKIE_MAX_AGE,
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
                error:
                    "Unable to create account.",
            });
        }
    },
);


//--------------------------------------------------
// Login
//--------------------------------------------------

router.post(
    "/auth/login",
    async (req, res) => {

        try {

            const email =
                typeof req.body?.email === "string"
                    ? req.body.email
                        .trim()
                        .toLowerCase()
                    : "";

            const password =
                typeof req.body?.password === "string"
                    ? req.body.password
                    : "";


            if (!email || !password) {

                res.status(400).json({
                    error:
                        "Email and password are required.",
                });

                return;
            }


            const [user] =
                await db
                    .select({
                        id: usersTable.id,
                        email: usersTable.email,
                        name: usersTable.name,
                        passwordHash:
                            usersTable.passwordHash,
                        isActive:
                            usersTable.isActive,
                    })
                    .from(usersTable)
                    .where(
                        eq(
                            usersTable.email,
                            email,
                        ),
                    )
                    .limit(1);


            /*
             * Use the same response for a missing account
             * and a wrong password so we don't reveal
             * whether an email exists.
             */

            if (!user) {

                res.status(401).json({
                    error:
                        "Invalid email or password.",
                });

                return;
            }


            if (!user.isActive) {

                res.status(403).json({
                    error:
                        "This account is inactive.",
                });

                return;
            }


            const passwordIsValid =
                await verifyPassword(
                    password,
                    user.passwordHash,
                );


            if (!passwordIsValid) {

                res.status(401).json({
                    error:
                        "Invalid email or password.",
                });

                return;
            }


            const session =
                await createSession(user.id);


            res.cookie(
                SESSION_COOKIE_NAME,
                session.token,
                {
                    httpOnly: true,
                    secure:
                        process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge:
                        SESSION_COOKIE_MAX_AGE,
                    path: "/",
                },
            );


            res.status(200).json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
            });

        } catch (error) {

            console.error(
                "Login failed:",
                error,
            );

            res.status(500).json({
                error:
                    "Unable to log in.",
            });
        }
    },
);


//--------------------------------------------------
// Current User
//--------------------------------------------------

router.get(
    "/auth/me",
    async (req, res) => {

        try {

            const token =
                req.cookies?.[
                SESSION_COOKIE_NAME
                ];


            if (!token) {

                res.status(401).json({
                    error:
                        "Not authenticated.",
                });

                return;
            }


            const session =
                await getSession(token);


            if (!session) {

                res.status(401).json({
                    error:
                        "Not authenticated.",
                });

                return;
            }


            const [user] =
                await db
                    .select({
                        id: usersTable.id,
                        email: usersTable.email,
                        name: usersTable.name,
                        isActive:
                            usersTable.isActive,
                    })
                    .from(usersTable)
                    .where(
                        eq(
                            usersTable.id,
                            session.userId,
                        ),
                    )
                    .limit(1);


            if (!user || !user.isActive) {

                res.status(401).json({
                    error:
                        "Not authenticated.",
                });

                return;
            }


            res.status(200).json({
                user,
            });

        } catch (error) {

            console.error(
                "Authentication check failed:",
                error,
            );

            res.status(500).json({
                error:
                    "Unable to verify authentication.",
            });
        }
    },
);


//--------------------------------------------------
// Logout
//--------------------------------------------------

router.post(
    "/auth/logout",
    async (req, res) => {

        try {

            const token =
                req.cookies?.[
                SESSION_COOKIE_NAME
                ];


            if (token) {

                await deleteSession(token);
            }


            res.clearCookie(
                SESSION_COOKIE_NAME,
                {
                    httpOnly: true,
                    secure:
                        process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                },
            );


            res.status(200).json({
                success: true,
            });

        } catch (error) {

            console.error(
                "Logout failed:",
                error,
            );

            res.status(500).json({
                error:
                    "Unable to log out.",
            });
        }
    },
);


export default router;