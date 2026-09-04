import express, { type Express } from "express";

import cors from "cors";

import cookieParser from "cookie-parser";

import router from "./routes";

import derivOAuthRouter from "./routes/deriv-oauth";

const app: Express = express();

// --------------------------------------------------

// Middleware

// --------------------------------------------------

app.use(cors());

app.use(express.json());

app.use(cookieParser());

// --------------------------------------------------

// API Routes

// --------------------------------------------------

app.use("/api", router);

app.use("/api", derivOAuthRouter);

export default app;