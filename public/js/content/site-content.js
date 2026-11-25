/**
 * Editable public-site content.
 *
 * This file holds shared navigation, contact and footer details. Page prose
 * stays in the HTML files so it remains semantic and crawlable. Values that
 * the owner has not supplied are deliberately left empty or clearly labelled.
 */
export const siteContent = Object.freeze({
  business: Object.freeze({
    name: "Bethel Organic Farm",
    location: "Dhoni, Palakkad, Kerala, India",
  }),

  contact: Object.freeze({
    // Supply the full WhatsApp URL (for example a wa.me link) when approved.
    whatsappUrl: "",
    whatsappLabel: "WhatsApp details to be supplied",
    phone: "Phone number to be supplied",
    email: "Email address to be supplied",
    address: "Full street address to be supplied",
    // Supply a genuine map link only when the owner approves it.
    mapUrl: "",
    mapLabel: "Map link to be supplied",
  }),

  navigation: Object.freeze([
    { id: "home", label: "Home", href: "/" },
    { id: "about", label: "About", href: "/about.html" },
    { id: "stay", label: "Stay", href: "/stay.html" },
    { id: "experiences", label: "Experiences", href: "/experiences.html" },
    { id: "restaurant", label: "Restaurant", href: "/restaurant.html" },
    { id: "packages", label: "Packages", href: "/packages.html" },
    { id: "gallery", label: "Gallery", href: "/gallery.html" },
    { id: "reviews", label: "Reviews", href: "/reviews.html" },
    { id: "contact", label: "Contact", href: "/contact.html" },
    { id: "faq", label: "FAQ", href: "/faq.html" },
  ]),

  footer: Object.freeze({
    note: "Prototype preview · details awaiting owner approval.",
    enquiriesTitle: "Enquiries",
    exploreTitle: "Explore",
    staffLabel: "Staff area",
  }),

  common: Object.freeze({
    toBeConfigured: "To be configured",
    ownerContentPending: "Owner content pending",
  }),

  gallery: Object.freeze({
    note: "Gallery image slots are placeholders. Replace only with genuine Bethel Organic Farm photography.",
  }),

  reviews: Object.freeze({
    emptyTitle: "Guest stories coming soon",
    emptyText: "Only verified, owner-supplied testimonials will appear here.",
  }),

  faq: Object.freeze({
    note: "Questions and answers will be added only after policies are confirmed.",
  }),
});
