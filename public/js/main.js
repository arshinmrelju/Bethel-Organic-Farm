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

/* Farm animals strip: seamless auto-scroll with arrow controls. */
const breedsSection = document.getElementById("animals");
const breedsViewport = document.querySelector("[data-breeds-viewport]");
const breedsTrack = document.querySelector("[data-breeds-track]");

if (breedsSection && breedsViewport && breedsTrack && breedsTrack.children.length > 1) {
  const originals = [...breedsTrack.children];
  for (const card of originals) {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    breedsTrack.append(clone);
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cards = [...breedsTrack.children];
  const prevButton = document.querySelector("[data-breeds-prev]");
  const nextButton = document.querySelector("[data-breeds-next]");
  let frame = 0;
  let lastTime = 0;
  let paused = false;
  let resumeTimer = 0;
  let onScreen = false;

  const loopWidth = () => cards[originals.length].offsetLeft - cards[0].offsetLeft;
  const stepWidth = () => cards[1].offsetLeft - cards[0].offsetLeft;

  const advance = (time) => {
    if (!lastTime) lastTime = time;
    const delta = Math.min(time - lastTime, 64);
    lastTime = time;
    if (!paused && !reduceMotion.matches) {
      const limit = loopWidth();
      if (limit > 0) {
        breedsViewport.scrollLeft += delta * 0.03;
        if (breedsViewport.scrollLeft >= limit) breedsViewport.scrollLeft -= limit;
      }
    }
    frame = requestAnimationFrame(advance);
  };

  const start = () => {
    if (frame || reduceMotion.matches) return;
    lastTime = 0;
    frame = requestAnimationFrame(advance);
  };

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  const holdScroll = (duration) => {
    paused = true;
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => { paused = false; }, duration);
  };

  breedsViewport.addEventListener("pointerenter", () => { paused = true; });
  breedsViewport.addEventListener("pointerleave", () => { paused = false; });
  breedsViewport.addEventListener("focusin", () => { paused = true; });
  breedsViewport.addEventListener("focusout", () => { paused = false; });
  breedsViewport.addEventListener("pointerdown", () => holdScroll(4000), { passive: true });
  breedsViewport.addEventListener("wheel", () => holdScroll(4000), { passive: true });

  prevButton?.addEventListener("click", () => {
    holdScroll(6000);
    if (breedsViewport.scrollLeft < stepWidth()) breedsViewport.scrollLeft += loopWidth();
    breedsViewport.scrollBy({ left: -stepWidth(), behavior: "smooth" });
  });

  nextButton?.addEventListener("click", () => {
    holdScroll(6000);
    breedsViewport.scrollBy({ left: stepWidth(), behavior: "smooth" });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (onScreen) start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    }, { threshold: 0 }).observe(breedsSection);
  } else {
    onScreen = true;
    start();
  }
}
