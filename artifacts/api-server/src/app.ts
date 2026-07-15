import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path"; // Ensure this is imported
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. API ROUTES: Must come first
app.use("/api", router);

// 2. STATIC FILES & CATCH-ALL: Must come AFTER API routes
// This serves your built frontend files
app.use(express.static(path.join(__dirname, "../public"))); 

// This handles client-side routing by serving index.html for unknown paths
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Triggering a redeploy to clear cache and sync changes
export default app;