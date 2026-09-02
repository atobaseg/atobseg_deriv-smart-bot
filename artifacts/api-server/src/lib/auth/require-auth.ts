import type { NextFunction, Request, Response } from "express";

import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import { getSession } from "./sessions";

const SESSION_COOKIE_NAME = "deriv_session";

export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
}

export interface AuthenticatedRequest
    extends Request {
    user: AuthenticatedUser;
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {

    try {

        const token =
            req.cookies?.[
            SESSION_COOKIE_NAME
            ];

        if (!token) {

            res.status(401).json({
                error: "Not authenticated.",
            });

            return;
        }

        const session =
            await getSession(token);

        if (!session) {

            res.status(401).json({
                error: "Not authenticated.",
            });

            return;
        }

        const [user] =
            await db
                .select({
                    id: usersTable.id,
                    email: usersTable.email,
                    name: usersTable.name,
                    isActive: usersTable.isActive,
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
                error: "Not authenticated.",
            });

            return;
        }

        (
            req as AuthenticatedRequest
        ).user = user;

        next();

    } catch (error) {

        console.error(
            "Authentication middleware failed:",
            error,
        );

        res.status(500).json({
            error:
                "Unable to verify authentication.",
        });
    }
}