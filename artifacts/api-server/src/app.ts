import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", router);

// Health check endpoint to ensure server is alive
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

export default app;