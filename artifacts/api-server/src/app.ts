import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());

// 1. API ROUTES
app.use("/api", router);

// 2. HEALTH CHECK
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// 3. STATIC FILES
const staticPath = path.resolve(__dirname, "../dist");
app.use(express.static(staticPath));

// 4. CATCH-ALL FOR FRONTEND (Using Middleware instead of app.get)
// This avoids the path-to-regexp parser entirely.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(staticPath, "index.html"));
});

// 5. START SERVER
const port = process.env.PORT || 10000;

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

export default app;