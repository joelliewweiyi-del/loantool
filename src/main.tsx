import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-reload when a new service worker activates (PWA update)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
