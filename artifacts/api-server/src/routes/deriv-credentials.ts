import { Router, type IRouter } from "express";

import {
    getUserDerivCredentials,
    saveUserDerivCredentials,
    deleteUserDerivCredentials,
} from "../lib/auth/deriv-credentials";

import {
    requireAuth,
    type AuthenticatedRequest,
} from "../lib/auth/require-auth";

const router: IRouter = Router();


//--------------------------------------------------
// Get Current User's Deriv Credentials
//--------------------------------------------------

router.get(
    "/auth/deriv-credentials",
    requireAuth,
    async (req, res) => {

        try {

            const user =
                (req as AuthenticatedRequest).user;

            const credentials =
                await getUserDerivCredentials(
                    user.id
                );


            if (!credentials) {

                res.status(404).json({
                    error:
                        "No Deriv credentials have been saved.",
                });

                return;
            }


            /*
             * Never return the actual Deriv tokens
             * to the browser.
             *
             * We only confirm that credentials exist.
             */

            res.status(200).json({
                configured: true,
                appIdConfigured:
                    Boolean(credentials.appId),
                demoTokenConfigured:
                    Boolean(credentials.demoToken),
                realTokenConfigured:
                    Boolean(credentials.realToken),
            });

        } catch (error) {

            console.error(
                "Failed to get Deriv credential status:",
                error,
            );

            res.status(500).json({
                error:
                    "Unable to retrieve Deriv credential status.",
            });
        }
    },
);


//--------------------------------------------------
// Save Current User's Deriv Credentials
//--------------------------------------------------

router.post(
    "/auth/deriv-credentials",
    requireAuth,
    async (req, res) => {

        try {

            const user =
                (req as AuthenticatedRequest).user;


            const appId =
                typeof req.body?.appId === "string"
                    ? req.body.appId.trim()
                    : "";


            const demoToken =
                typeof req.body?.demoToken === "string"
                    ? req.body.demoToken.trim()
                    : "";


            const realToken =
                typeof req.body?.realToken === "string"
                    ? req.body.realToken.trim()
                    : "";


            if (!appId) {

                res.status(400).json({
                    error:
                        "Deriv App ID is required.",
                });

                return;
            }


            if (!demoToken && !realToken) {

                res.status(400).json({
                    error:
                        "At least one Deriv account token is required.",
                });

                return;
            }


            await saveUserDerivCredentials({
                userId: user.id,
                appId,
                demoToken:
                    demoToken || undefined,
                realToken:
                    realToken || undefined,
            });


            res.status(200).json({
                success: true,
                message:
                    "Deriv credentials saved successfully.",
            });

        } catch (error) {

            console.error(
                "Failed to save Deriv credentials:",
                error,
            );

            res.status(500).json({
                error:
                    "Unable to save Deriv credentials.",
            });
        }
    },
);


//--------------------------------------------------
// Delete Current User's Deriv Credentials
//--------------------------------------------------

router.delete(
    "/auth/deriv-credentials",
    requireAuth,
    async (req, res) => {

        try {

            const user =
                (req as AuthenticatedRequest).user;


            await deleteUserDerivCredentials(
                user.id
            );


            res.status(200).json({
                success: true,
                message:
                    "Deriv credentials deleted successfully.",
            });

        } catch (error) {

            console.error(
                "Failed to delete Deriv credentials:",
                error,
            );

            res.status(500).json({
                error:
                    "Unable to delete Deriv credentials.",
            });
        }
    },
);


export default router;