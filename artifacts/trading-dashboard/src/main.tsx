import { createRoot } from "react-dom/client";

import { setBaseUrl } from "@workspace/api-client-react";

import App from "./App";

import "./index.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured.");
}

setBaseUrl(apiBaseUrl);

createRoot(document.getElementById("root")!).render(<App />);