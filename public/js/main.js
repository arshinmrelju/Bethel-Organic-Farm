// Public-site interactions only. Booking, payment, and Firebase logic belong to later stages.
import { siteConfig } from "./config.js";
import { initializeI18n } from "./i18n.js";

initializeI18n();

document.documentElement.dataset.project = "bethel-organic-farm";

const menuButton = document.querySelector(".menu-toggle");
const menu = menuButton ? document.getElementById(menuButton.getAttribute("aria-controls")) : null;

if (menuButton && menu) {
  const setMenuOpen = (open) => {
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    menu.dataset.open = String(open);
  };

  menuButton.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuButton.focus();
    }
  });
}

const sectionLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const observedSections = sectionLinks
  .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
  .filter(({ section }) => section);

if ("IntersectionObserver" in window && observedSections.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const match = observedSections.find(({ section }) => section === entry.target);
      if (!match) continue;
      if (entry.isIntersecting) {
        for (const { link } of observedSections) link.removeAttribute("aria-current");
        match.link.setAttribute("aria-current", "location");
      }
    }
  }, { rootMargin: "-20% 0px -68% 0px", threshold: 0 });

  observedSections.forEach(({ section }) => sectionObserver.observe(section));
}

const whatsappNumber = String(siteConfig.whatsappNumber || "").replace(/\D/g, "");
for (const link of document.querySelectorAll("[data-whatsapp-link]")) {
  if (whatsappNumber) {
    link.href = `https://wa.me/${whatsappNumber}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.removeAttribute("aria-describedby");
  } else {
    link.href = "#contact";
  }
}

const year = document.querySelector("[data-current-year]");
if (year) year.textContent = String(new Date().getFullYear());
