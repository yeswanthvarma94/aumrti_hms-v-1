import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import OfflineBanner from "./components/OfflineBanner.tsx";
import { registerServiceWorker } from "./lib/registerSW";
import "./index.css";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <OfflineBanner />
    <App />
  </ErrorBoundary>
);
