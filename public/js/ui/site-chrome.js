import { siteContent } from "../content/site-content.js";

const currentPage = document.body.dataset.page || "home";

function renderNavigation() {
  const items = siteContent.navigation
    .map((item) => {
      const current = item.id === currentPage ? ' aria-current="page"' : "";
      return `<li><a class="site-nav__link" href="${item.href}"${current}>${item.label}</a></li>`;
    })
    .join("");

  return `
    <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="primary-navigation" aria-label="Open navigation menu">
      <span class="nav-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span>
      <span class="nav-toggle__text">Menu</span>
    </button>
    <nav id="primary-navigation" class="site-nav site-nav--public" aria-label="Main navigation">
      <ul class="site-nav__list">${items}</ul>
    </nav>
  `;
}

function renderFooterLinks() {
  return siteContent.navigation
    .map((item) => `<li><a class="footer-link" href="${item.href}">${item.label}</a></li>`)
    .join("");
}

export function renderSiteChrome() {
  const headerHost = document.querySelector("[data-site-header]");
  const footerHost = document.querySelector("[data-site-footer]");

  if (headerHost) {
    headerHost.innerHTML = `
      <header class="site-header">
        <div class="shell site-header__inner">
          <a class="wordmark" href="/">${siteContent.business.name}</a>
          ${renderNavigation()}
        </div>
      </header>
    `;
  }

  if (footerHost) {
    footerHost.innerHTML = `
      <footer class="site-footer site-footer--public">
        <div class="shell footer-grid">
          <div class="footer-block">
            <p class="wordmark">${siteContent.business.name}</p>
            <p class="muted" data-content="business.location">${siteContent.business.location}</p>
            <p id="footer-languages" class="small-note"></p>
          </div>

          <nav class="footer-block" aria-label="Footer navigation">
            <h2 class="footer-heading">${siteContent.footer.exploreTitle}</h2>
            <ul class="footer-links">${renderFooterLinks()}</ul>
          </nav>

          <div class="footer-block">
            <h2 class="footer-heading">${siteContent.footer.enquiriesTitle}</h2>
            <p class="small-note" data-content="contact.whatsappLabel">${siteContent.contact.whatsappLabel}</p>
            <p class="small-note" data-content="contact.phone">${siteContent.contact.phone}</p>
            <p class="small-note" data-content="contact.email">${siteContent.contact.email}</p>
            <a class="footer-link" href="/contact.html" data-contact-link="whatsapp" data-fallback="/contact.html"><span data-contact-label>WhatsApp enquiry</span></a>
          </div>
        </div>

        <div class="shell footer-bottom">
          <p>© <span data-current-year></span> ${siteContent.business.name}</p>
          <p class="small-note" data-content="footer.note">${siteContent.footer.note}</p>
          <a class="footer-link" href="/admin/">${siteContent.footer.staffLabel}</a>
        </div>
      </footer>
    `;
  }

  const mobileHost = document.querySelector("[data-mobile-actions]");
  if (mobileHost) {
    mobileHost.innerHTML = `
      <div class="mobile-action-bar" aria-label="Quick actions">
        <a class="button button--block" href="/contact.html">Plan your visit</a>
        <a class="button button--secondary button--block" href="/contact.html" data-contact-link="whatsapp" data-fallback="/contact.html"><span data-contact-label>WhatsApp enquiry</span></a>
      </div>
    `;
  }
}
