import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. API ROUTES: Must come first
app.use("/api", router);

// 2. STATIC FILES & CATCH-ALL: Must come AFTER API routes
// Correcting the path to target the 'dist' folder where your build output lives
const staticPath = path.join(__dirname, "../../dist");
app.use(express.static(staticPath));

// This handles client-side routing by serving index.html for unknown paths
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

export default app;