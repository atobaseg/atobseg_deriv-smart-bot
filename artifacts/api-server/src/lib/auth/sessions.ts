import {
    createHash,
    randomBytes,
} from "node:crypto";

import {
    db,
    sessionsTable,
} from "@workspace/db";

import {
    eq,
    lt,
} from "drizzle-orm";


//--------------------------------------------------
// Configuration
//--------------------------------------------------

const SESSION_TOKEN_BYTES = 32;

const SESSION_DURATION_MS =
    1000 *
    60 *
    60 *
    24 *
    30;


//--------------------------------------------------
// Types
//--------------------------------------------------

export interface SessionData {
    sessionId: string;
    userId: string;
    token: string;
    expiresAt: Date;
}


//--------------------------------------------------
// Hash Session Token
//--------------------------------------------------

function hashSessionToken(
    token: string,
): string {

    return createHash("sha256")
        .update(token)
        .digest("hex");
}


//--------------------------------------------------
// Create Session
//--------------------------------------------------

export async function createSession(
    userId: string,
): Promise<SessionData> {

    const token =
        randomBytes(
            SESSION_TOKEN_BYTES,
        ).toString("base64url");

    const tokenHash =
        hashSessionToken(token);

    const expiresAt =
        new Date(
            Date.now() +
            SESSION_DURATION_MS,
        );

    const [session] =
        await db
            .insert(sessionsTable)
            .values({
                userId,
                tokenHash,
                expiresAt,
            })
            .returning({
                id: sessionsTable.id,
            });

    if (!session) {
        throw new Error(
            "Failed to create login session.",
        );
    }

    return {
        sessionId: session.id,
        userId,
        token,
        expiresAt,
    };
}


//--------------------------------------------------
// Get Session
//--------------------------------------------------

export async function getSession(
    token: string,
): Promise<{
    sessionId: string;
    userId: string;
    expiresAt: Date;
} | null> {

    if (!token) {
        return null;
    }

    const tokenHash =
        hashSessionToken(token);

    const [session] =
        await db
            .select({
                id: sessionsTable.id,
                userId: sessionsTable.userId,
                expiresAt: sessionsTable.expiresAt,
            })
            .from(sessionsTable)
            .where(
                eq(
                    sessionsTable.tokenHash,
                    tokenHash,
                ),
            )
            .limit(1);

    if (!session) {
        return null;
    }

    if (
        session.expiresAt.getTime() <=
        Date.now()
    ) {

        await db
            .delete(sessionsTable)
            .where(
                eq(
                    sessionsTable.id,
                    session.id,
                ),
            );

        return null;
    }

    return {
        sessionId: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
    };
}


//--------------------------------------------------
// Delete Session
//--------------------------------------------------

export async function deleteSession(
    token: string,
): Promise<void> {

    if (!token) {
        return;
    }

    const tokenHash =
        hashSessionToken(token);

    await db
        .delete(sessionsTable)
        .where(
            eq(
                sessionsTable.tokenHash,
                tokenHash,
            ),
        );
}


//--------------------------------------------------
// Delete All User Sessions
//--------------------------------------------------

export async function deleteAllUserSessions(
    userId: string,
): Promise<void> {

    await db
        .delete(sessionsTable)
        .where(
            eq(
                sessionsTable.userId,
                userId,
            ),
        );
}


//--------------------------------------------------
// Remove Expired Sessions
//--------------------------------------------------

export async function cleanupExpiredSessions(): Promise<void> {

    await db
        .delete(sessionsTable)
        .where(
            lt(
                sessionsTable.expiresAt,
                new Date(),
            ),
        );
}