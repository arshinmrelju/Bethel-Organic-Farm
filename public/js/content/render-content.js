import { siteContent } from "./site-content.js";
import { siteConfig } from "../config/firebase-config.js";

function readPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function renderTextPlaceholders() {
  document.querySelectorAll("[data-content]").forEach((element) => {
    const value = readPath(siteContent, element.dataset.content);
    if (typeof value === "string") {
      element.textContent = value;
    }
  });
}

function renderOptionalLinks() {
  const readyLabels = {
    whatsapp: "WhatsApp enquiry",
    map: "Open directions map",
  };
  const pendingLabels = {
    whatsapp: siteContent.contact.whatsappLabel,
    map: siteContent.contact.mapLabel,
  };

  document.querySelectorAll("[data-contact-link]").forEach((link) => {
    const kind = link.dataset.contactLink;
    const url = siteContent.contact[kind + "Url"] || "";
    const label = link.querySelector("[data-contact-label]");

    if (url) {
      link.setAttribute("href", url);
      link.removeAttribute("data-placeholder");
      link.setAttribute("aria-label", readyLabels[kind] || "Open link");
      if (label) label.textContent = readyLabels[kind] || "Open link";
      return;
    }

    link.setAttribute("href", link.dataset.fallback || "/contact.html");
    link.setAttribute("data-placeholder", "true");
    link.setAttribute(
      "aria-label",
      `${pendingLabels[kind] || "Details pending"}. Open contact page.`,
    );
    if (label) label.textContent = pendingLabels[kind] || "Details pending";
  });
}

function renderPlannedLanguages() {
  const element = document.querySelector("#footer-languages");
  if (!element) return;
  const labels = siteConfig.languages.map((language) => language.label);
  element.textContent = `Planned languages: ${labels.join(" · ")}`;
}

function renderCurrentYear() {
  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
}

export function renderContent() {
  renderTextPlaceholders();
  renderOptionalLinks();
  renderPlannedLanguages();
  renderCurrentYear();
}
