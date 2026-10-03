import express, { type Express } from "express";

import cors from "cors";

import cookieParser from "cookie-parser";

import router from "./routes";

const app: Express = express();

// --------------------------------------------------

// Middleware

// --------------------------------------------------

app.use(
    cors({
        origin: "https://atobseg-deriv-smart-bot-1.onrender.com",
        credentials: true,
    }),
);

app.use(express.json());

app.use(cookieParser());

// --------------------------------------------------

// API Routes

// --------------------------------------------------

app.use("/api", router);

export default app;