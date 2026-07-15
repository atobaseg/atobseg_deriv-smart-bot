import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());

// 1. API ROUTES
app.use("/api", router);

// 2. STATIC FILES & CATCH-ALL
const staticPath = path.join(__dirname, "../../dist");
app.use(express.static(staticPath));

app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

export default app;