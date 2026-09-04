import { Router, type IRouter } from "express";
import crypto from "crypto";

const router: IRouter = Router();

const OAUTH_PKCE_COOKIE = "deriv_oauth_pkce";

const OAUTH_PKCE_MAX_AGE =
    1000 *
    60 *
    10;

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function base64UrlEncode(
    value: Buffer,
): string {
    return value
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function generateCodeVerifier(): string {
    return base64UrlEncode(
        crypto.randomBytes(64),
    );
}

function generateCodeChallenge(
    verifier: string,
): string {
    const hash =
        crypto
            .createHash("sha256")
            .update(verifier)
            .digest();

    return base64UrlEncode(hash);
}

function generateState(): string {
    return base64UrlEncode(
        crypto.randomBytes(32),
    );
}

// --------------------------------------------------
// Start Deriv OAuth
// --------------------------------------------------

router.get(
    "/auth/deriv",
    (_req, res) => {

        const clientId =
            process.env.DERIV_OAUTH_CLIENT_ID;

        if (!clientId) {
            res.status(500).json({
                error:
                    "Deriv OAuth is not configured.",
            });

            return;
        }

        const redirectUri =
            process.env.DERIV_OAUTH_REDIRECT_URI;

        if (!redirectUri) {
            res.status(500).json({
                error:
                    "Deriv OAuth redirect URI is not configured.",
            });

            return;
        }

        const codeVerifier =
            generateCodeVerifier();

        const codeChallenge =
            generateCodeChallenge(
                codeVerifier,
            );

        const state =
            generateState();

        /*
         * Store the PKCE verifier and OAuth state
         * in an HTTP-only cookie.
         *
         * The browser cannot read this cookie from
         * JavaScript, but it will send it back to
         * our callback endpoint.
         */
        res.cookie(
            OAUTH_PKCE_COOKIE,
            JSON.stringify({
                state,
                codeVerifier,
            }),
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV ===
                    "production",
                sameSite: "lax",
                maxAge:
                    OAUTH_PKCE_MAX_AGE,
                path: "/",
            },
        );

        const authorizationUrl =
            new URL(
                "https://auth.deriv.com/oauth2/auth",
            );

        authorizationUrl.searchParams.set(
            "response_type",
            "code",
        );

        authorizationUrl.searchParams.set(
            "client_id",
            clientId,
        );

        authorizationUrl.searchParams.set(
            "redirect_uri",
            redirectUri,
        );

        authorizationUrl.searchParams.set(
            "scope",
            "trade account_manage application_read",
        );

        authorizationUrl.searchParams.set(
            "state",
            state,
        );

        authorizationUrl.searchParams.set(
            "code_challenge",
            codeChallenge,
        );

        authorizationUrl.searchParams.set(
            "code_challenge_method",
            "S256",
        );

        res.redirect(
            authorizationUrl.toString(),
        );
    },
);

export default router;