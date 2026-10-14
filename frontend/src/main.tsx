import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initAnalytics } from "./analytics";
import { I18nProvider } from "./i18n/context";
import { ThemeProvider } from "./theme/context";
import { startVersionWatch } from "./versionWatch";
import "./industry.css";
import "./index.css";

initAnalytics();
startVersionWatch();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
