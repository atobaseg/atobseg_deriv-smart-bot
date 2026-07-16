import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

// Enable CORS for your specific frontend if necessary
app.use(cors());
app.use(express.json());

// 1. API ROUTES: Handled first so they are never intercepted
app.use("/api", router);

// 2. SERVE FRONTEND ASSETS: These are your React build files
const staticPath = path.resolve(__dirname, "../dist");
app.use(express.static(staticPath));

// 3. UNIFIED CATCH-ALL: Everything else goes to the dashboard
// This uses middleware to ensure non-API requests always get index.html
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(staticPath, "index.html"));
});

// 4. PORT BINDING: The critical line for Render
const port = process.env.PORT || 10000;
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Unified service running on port ${port}`);
});

export default app;