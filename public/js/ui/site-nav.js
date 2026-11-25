/** Accessible mobile navigation using the shared design-system classes. */
export function initSiteNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const navigation = document.querySelector("#primary-navigation");

  if (!toggle || !navigation) return;

  const mobileQuery = window.matchMedia("(max-width: 47.99rem)");

  function syncState() {
    if (!mobileQuery.matches) {
      navigation.classList.remove("is-open");
      navigation.inert = false;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      return;
    }

    const isOpen = navigation.classList.contains("is-open");
    navigation.inert = !isOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu",
    );
  }

  toggle.addEventListener("click", () => {
    navigation.classList.toggle("is-open");
    syncState();
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navigation.classList.remove("is-open");
      syncState();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !navigation.classList.contains("is-open")) return;
    navigation.classList.remove("is-open");
    syncState();
    toggle.focus();
  });

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", syncState);
  } else {
    mobileQuery.addListener(syncState);
  }

  syncState();
}
