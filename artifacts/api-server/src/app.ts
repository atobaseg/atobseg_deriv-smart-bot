import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());

// DEBUGGING: Log all incoming requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[DEBUG] Incoming Request: ${req.method} ${req.url}`);
  next();
});

// 1. API ROUTES
app.use("/api", router);

// 2. HEALTH CHECK
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

// 3. STATIC FILES
// Using path.resolve to help diagnose the directory path
const staticPath = path.resolve(__dirname, "../../dist");
console.log("Looking for static files at:", staticPath); 
app.use(express.static(staticPath));

// 4. CATCH-ALL FOR FRONTEND
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

export default app;