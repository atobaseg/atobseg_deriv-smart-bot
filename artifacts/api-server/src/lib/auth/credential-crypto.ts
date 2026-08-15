import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
} from "node:crypto";


//--------------------------------------------------
// Configuration
//--------------------------------------------------

const ALGORITHM = "aes-256-gcm";

const IV_LENGTH = 12;

const AUTH_TAG_LENGTH = 16;

const KEY_LENGTH = 32;


//--------------------------------------------------
// Encryption Key
//--------------------------------------------------

function getEncryptionKey(): Buffer {

    const encodedKey =
        process.env.DERIV_CREDENTIAL_ENCRYPTION_KEY;

    if (!encodedKey) {

        throw new Error(
            "DERIV_CREDENTIAL_ENCRYPTION_KEY is not configured."
        );

    }

    const key =
        Buffer.from(encodedKey, "base64");

    if (key.length !== KEY_LENGTH) {

        throw new Error(
            "DERIV_CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes."
        );

    }

    return key;

}


//--------------------------------------------------
// Encrypt
//--------------------------------------------------

export function encryptCredential(
    value: string
): string {

    if (!value) {

        throw new Error(
            "Cannot encrypt an empty credential."
        );

    }

    const key =
        getEncryptionKey();

    const iv =
        randomBytes(IV_LENGTH);

    const cipher =
        createCipheriv(
            ALGORITHM,
            key,
            iv
        );

    const encrypted =
        Buffer.concat([
            cipher.update(value, "utf8"),
            cipher.final(),
        ]);

    const authTag =
        cipher.getAuthTag();

    /*
     * Store everything needed for decryption together:
     *
     * iv:encrypted:authTag
     *
     * All components are base64 encoded.
     */

    return [
        iv.toString("base64"),
        encrypted.toString("base64"),
        authTag.toString("base64"),
    ].join(":");

}


//--------------------------------------------------
// Decrypt
//--------------------------------------------------

export function decryptCredential(
    encryptedValue: string
): string {

    if (!encryptedValue) {

        throw new Error(
            "Cannot decrypt an empty credential."
        );

    }

    const parts =
        encryptedValue.split(":");

    if (parts.length !== 3) {

        throw new Error(
            "Invalid encrypted credential format."
        );

    }

    const [
        ivBase64,
        encryptedBase64,
        authTagBase64,
    ] = parts;

    const iv =
        Buffer.from(
            ivBase64,
            "base64"
        );

    const encrypted =
        Buffer.from(
            encryptedBase64,
            "base64"
        );

    const authTag =
        Buffer.from(
            authTagBase64,
            "base64"
        );

    if (iv.length !== IV_LENGTH) {

        throw new Error(
            "Invalid encrypted credential IV."
        );

    }

    if (authTag.length !== AUTH_TAG_LENGTH) {

        throw new Error(
            "Invalid encrypted credential authentication tag."
        );

    }

    const key =
        getEncryptionKey();

    const decipher =
        createDecipheriv(
            ALGORITHM,
            key,
            iv
        );

    decipher.setAuthTag(authTag);

    const decrypted =
        Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);

    return decrypted.toString("utf8");

}


//--------------------------------------------------
// Generate a new encryption key
//--------------------------------------------------

export function generateCredentialEncryptionKey(): string {

    return randomBytes(KEY_LENGTH)
        .toString("base64");

}