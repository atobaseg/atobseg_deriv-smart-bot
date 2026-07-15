import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());

// 1. API ROUTES MUST BE FIRST
// Ensure your API router is mounted before the static file handler
app.use("/api", router);

// 2. HEALTH CHECK
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// 3. STATIC FILES
const staticPath = path.join(__dirname, "../../dist");
app.use(express.static(staticPath));

// 4. CATCH-ALL FOR FRONTEND (Must be absolute last)
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

export default app;