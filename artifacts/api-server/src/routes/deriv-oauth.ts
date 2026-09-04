import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Start Deriv OAuth
router.get("/auth/deriv", (_req, res) => {
    const clientId = process.env.DERIV_OAUTH_CLIENT_ID;

    if (!clientId) {
        res.status(500).json({
            error: "Deriv OAuth is not configured.",
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

    const state = crypto.randomUUID();

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

    res.redirect(
        authorizationUrl.toString(),
    );
});

export default router;