import { Router, type IRouter } from "express";
import crypto from "crypto";
import axios from "axios";

import {
    requireAuth,
    type AuthenticatedRequest,
} from "../lib/auth/require-auth";

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

// --------------------------------------------------
// Deriv OAuth Callback
// --------------------------------------------------

router.get(
    "/auth/deriv/callback",
    requireAuth,
    async (req, res) => {

        try {

            const authenticatedReq =
                req as AuthenticatedRequest;

            const user =
                authenticatedReq.user;

            const error =
                typeof req.query.error === "string"
                    ? req.query.error
                    : "";

            const errorDescription =
                typeof req.query.error_description ===
                    "string"
                    ? req.query.error_description
                    : "";

            if (error) {

                console.error(
                    "Deriv OAuth authorization failed:",
                    {
                        userId: user.id,
                        error,
                    },
                );

                res.status(400).json({
                    error:
                        "Deriv authorization was not completed.",
                });

                return;
            }

            const code =
                typeof req.query.code === "string"
                    ? req.query.code
                    : "";

            const returnedState =
                typeof req.query.state === "string"
                    ? req.query.state
                    : "";

            if (!code || !returnedState) {

                res.status(400).json({
                    error:
                        "Invalid Deriv OAuth callback.",
                });

                return;
            }

            const pkceCookie =
                req.cookies?.[
                OAUTH_PKCE_COOKIE
                ];

            if (!pkceCookie) {

                res.status(400).json({
                    error:
                        "Deriv OAuth session has expired or is missing.",
                });

                return;
            }

            let pkceData: {
                state: string;
                codeVerifier: string;
            };

            try {

                pkceData =
                    JSON.parse(pkceCookie);

            } catch {

                res.status(400).json({
                    error:
                        "Invalid Deriv OAuth session.",
                });

                return;
            }

            if (
                typeof pkceData.state !== "string" ||
                typeof pkceData.codeVerifier !== "string"
            ) {

                res.status(400).json({
                    error:
                        "Invalid Deriv OAuth session.",
                });

                return;
            }

            if (
                !crypto.timingSafeEqual(
                    Buffer.from(returnedState),
                    Buffer.from(pkceData.state),
                )
            ) {

                console.error(
                    "Deriv OAuth state mismatch:",
                    {
                        userId: user.id,
                    },
                );

                res.status(400).json({
                    error:
                        "Invalid Deriv OAuth state.",
                });

                return;
            }

            const clientId =
                process.env.DERIV_OAUTH_CLIENT_ID;

            const redirectUri =
                process.env.DERIV_OAUTH_REDIRECT_URI;

            if (!clientId || !redirectUri) {

                res.status(500).json({
                    error:
                        "Deriv OAuth is not configured.",
                });

                return;
            }

            const tokenResponse =
                await axios.post(
                    "https://auth.deriv.com/oauth2/token",
                    new URLSearchParams({
                        grant_type:
                            "authorization_code",
                        client_id:
                            clientId,
                        code,
                        code_verifier:
                            pkceData.codeVerifier,
                        redirect_uri:
                            redirectUri,
                    }).toString(),
                    {
                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded",
                        },
                    },
                );

            const tokenData =
                tokenResponse.data;

            if (
                typeof tokenData?.access_token !==
                "string"
            ) {

                throw new Error(
                    "Deriv OAuth token response did not contain an access token.",
                );
            }

            /*
             * IMPORTANT:
             *
             * We intentionally do not return or log
             * the access token here.
             *
             * The next step will add dedicated encrypted
             * OAuth-token storage to the database.
             */

            res.clearCookie(
                OAUTH_PKCE_COOKIE,
                {
                    httpOnly: true,
                    secure:
                        process.env.NODE_ENV ===
                        "production",
                    sameSite: "lax",
                    path: "/",
                },
            );

            res.status(200).json({
                success: true,
                message:
                    "Deriv OAuth authorization completed successfully.",
                userId:
                    user.id,
                expiresIn:
                    Number(
                        tokenData.expires_in ??
                        0,
                    ),
            });

        } catch (error) {

            if (
                axios.isAxiosError(error)
            ) {

                console.error(
                    "Deriv OAuth token exchange failed:",
                    {
                        status:
                            error.response?.status,
                        data:
                            error.response?.data,
                    },
                );

            } else {

                console.error(
                    "Deriv OAuth callback failed:",
                    error,
                );
            }

            res.status(500).json({
                error:
                    "Unable to complete Deriv OAuth authorization.",
            });
        }
    },
);

export default router;