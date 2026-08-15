import {
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from "node:crypto";

import { promisify } from "node:util";


const scrypt =
    promisify(scryptCallback);


//--------------------------------------------------
// Configuration
//--------------------------------------------------

const SALT_LENGTH = 16;

const KEY_LENGTH = 64;


//--------------------------------------------------
// Hash Password
//--------------------------------------------------

export async function hashPassword(
    password: string,
): Promise<string> {

    if (!password) {
        throw new Error(
            "Password cannot be empty.",
        );
    }

    const salt =
        randomBytes(SALT_LENGTH);

    const derivedKey =
        await scrypt(
            password,
            salt,
            KEY_LENGTH,
        ) as Buffer;

    return [
        salt.toString("base64"),
        derivedKey.toString("base64"),
    ].join(":");
}


//--------------------------------------------------
// Verify Password
//--------------------------------------------------

export async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean> {

    if (!password || !storedHash) {
        return false;
    }

    const parts =
        storedHash.split(":");

    if (parts.length !== 2) {
        return false;
    }

    const [
        saltBase64,
        hashBase64,
    ] = parts;

    const salt =
        Buffer.from(
            saltBase64,
            "base64",
        );

    const expectedHash =
        Buffer.from(
            hashBase64,
            "base64",
        );

    if (
        salt.length !== SALT_LENGTH ||
        expectedHash.length !== KEY_LENGTH
    ) {
        return false;
    }

    const actualHash =
        await scrypt(
            password,
            salt,
            KEY_LENGTH,
        ) as Buffer;

    return timingSafeEqual(
        actualHash,
        expectedHash,
    );
}