import { eq } from "drizzle-orm";

import {
    db,
    derivCredentialsTable,
} from "@workspace/db";

import {
    decryptCredential,
    encryptCredential,
} from "./credential-crypto";


//--------------------------------------------------
// Types
//--------------------------------------------------

export interface UserDerivCredentials {

    appId: string;

    demoToken?: string;

    realToken?: string;

}


export interface SaveUserDerivCredentials {

    userId: string;

    appId: string;

    demoToken?: string;

    realToken?: string;

}


//--------------------------------------------------
// Save / Update Credentials
//--------------------------------------------------

export async function saveUserDerivCredentials(
    input: SaveUserDerivCredentials
): Promise<void> {

    if (!input.userId) {

        throw new Error(
            "User ID is required."
        );

    }

    if (!input.appId) {

        throw new Error(
            "Deriv App ID is required."
        );

    }

    if (
        !input.demoToken &&
        !input.realToken
    ) {

        throw new Error(
            "At least one Deriv account token is required."
        );

    }


    const existing =
        await db
            .select({
                id:
                    derivCredentialsTable.id,
            })
            .from(
                derivCredentialsTable
            )
            .where(
                eq(
                    derivCredentialsTable.userId,
                    input.userId
                )
            )
            .limit(1);


    const values = {

        userId:
            input.userId,

        appIdEncrypted:
            encryptCredential(
                input.appId
            ),

        demoTokenEncrypted:
            input.demoToken
                ? encryptCredential(
                    input.demoToken
                )
                : null,

        realTokenEncrypted:
            input.realToken
                ? encryptCredential(
                    input.realToken
                )
                : null,

        updatedAt:
            new Date(),

    };


    if (existing.length > 0) {

        await db
            .update(
                derivCredentialsTable
            )
            .set(values)
            .where(
                eq(
                    derivCredentialsTable.userId,
                    input.userId
                )
            );

        return;
    }


    await db
        .insert(
            derivCredentialsTable
        )
        .values(values);

}


//--------------------------------------------------
// Get Credentials
//--------------------------------------------------

export async function getUserDerivCredentials(
    userId: string
): Promise<UserDerivCredentials | null> {

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    const rows =
        await db
            .select({
                appIdEncrypted:
                    derivCredentialsTable.appIdEncrypted,

                demoTokenEncrypted:
                    derivCredentialsTable.demoTokenEncrypted,

                realTokenEncrypted:
                    derivCredentialsTable.realTokenEncrypted,
            })
            .from(
                derivCredentialsTable
            )
            .where(
                eq(
                    derivCredentialsTable.userId,
                    userId
                )
            )
            .limit(1);


    const row =
        rows[0];


    if (!row) {

        return null;

    }


    return {

        appId:
            decryptCredential(
                row.appIdEncrypted
            ),

        demoToken:
            row.demoTokenEncrypted
                ? decryptCredential(
                    row.demoTokenEncrypted
                )
                : undefined,

        realToken:
            row.realTokenEncrypted
                ? decryptCredential(
                    row.realTokenEncrypted
                )
                : undefined,

    };

}


//--------------------------------------------------
// Delete Credentials
//--------------------------------------------------

export async function deleteUserDerivCredentials(
    userId: string
): Promise<void> {

    if (!userId) {

        throw new Error(
            "User ID is required."
        );

    }


    await db
        .delete(
            derivCredentialsTable
        )
        .where(
            eq(
                derivCredentialsTable.userId,
                userId
            )
        );

}