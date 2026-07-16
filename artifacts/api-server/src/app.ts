import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());

// 1. API ROUTES - Explicitly defined before everything else
app.use("/api", router);

// 2. HEALTH CHECK
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// 3. STATIC FILES
// Based on your folder structure artifacts/api-server/src, 
// '../dist' should point to artifacts/api-server/dist
const staticPath = path.resolve(__dirname, "../dist");
app.use(express.static(staticPath));

// 4. CATCH-ALL FOR FRONTEND
app.get("*", (req, res, next) => {
  // If it's an API call that wasn't caught above, 
  // don't try to send the HTML file; let it 404 naturally.
  if (req.path.startsWith('/api')) {
    return next(); 
  }
  res.sendFile(path.join(staticPath, "index.html"));
});

// 5. START SERVER (Required for Render to detect port)
const port = process.env.PORT || 10000;

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

export default app;