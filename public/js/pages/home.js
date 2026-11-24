import { siteConfig } from "../config/firebase-config.js";
import { isFirebaseConfigured } from "../firebase/initialize.js";
import { setStatusMessage } from "../ui/status.js";

const statusElement = document.querySelector("#app-status");
const languagesElement = document.querySelector("#footer-languages");

function renderConfigurationStatus() {
  if (!isFirebaseConfigured) {
    setStatusMessage(
      statusElement,
      "Starter mode: replace the placeholders in public/js/config/firebase-config.js to enable connected features.",
      "error",
    );
    return;
  }

  setStatusMessage(
    statusElement,
    "Firebase configuration loaded. Website sections and booking journeys will be added in later stages.",
    "success",
  );
}

function renderPlannedLanguages() {
  if (!languagesElement) return;
  const labels = siteConfig.languages.map((language) => language.label);
  languagesElement.textContent = `Planned languages: ${labels.join(" · ")}`;
}

document.title = siteConfig.name;
renderConfigurationStatus();
renderPlannedLanguages();
