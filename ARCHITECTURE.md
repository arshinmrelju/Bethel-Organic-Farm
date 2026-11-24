# Architecture

## 1. Scope and status

This document describes the intended architecture for Bethel Organic Farm and
the boundaries that the foundation scaffold already enforces.

**Current stage:** foundation only. No business content, inventory records,
booking logic, payment processing or WhatsApp automation is implemented. The
rules currently deny all reads and writes so that no accidental data exposure
is possible while later stages are designed.

## 2. Frontend architecture

### 2.1 Delivery model

- Static HTML pages served by **Firebase Hosting**.
- CSS3 with custom properties for design tokens.
- Vanilla JavaScript ES modules loaded directly by the browser.
- Firebase JS SDK is loaded from the pinned CDN URLs in each page’s import map
  (`11.6.0`). Upgrades are deliberate code changes, not automatic.
- No bundler, framework, client-side router or global state library is used.

### 2.2 Module layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Pages | `public/*.html`, `public/admin/*.html` | Semantic markup and import map |
| Page entry points | `public/js/pages/`, `public/js/admin/` | Mount page behaviour only |
| Firebase | `public/js/firebase/initialize.js` | One shared Firebase app instance |
| Config | `public/js/config/firebase-config.js` | Public placeholders and confirmed site facts |
| UI helpers | `public/js/ui/` | Small reusable presentation helpers |
| Styling | `public/css/tokens.css`, `components.css`, `site.css`, `admin.css` | Tokens, shared patterns and page composition |
| Design preview | `public/design-system.html`, `css/demo.css`, `js/demo.js` | Internal token/component catalogue |
| Assets | `public/assets/` | Owner-approved static media only |

Add a new public page by creating an HTML file and a matching small module in
`public/js/pages/`. Add a new admin page by creating an HTML file under
`public/admin/` and a module under `public/js/admin/`. Keep each module focused
on one page or one helper.

### 2.3 Styling direction

`tokens.css` defines the “Cinematic Wilderness” palette and scale;
`components.css` provides the reusable public and admin patterns. The full
inventory lives in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) and is demonstrated
at `/design-system.html`. Effects are created with CSS gradients and spacing,
not stock photography. No testimonials, photos or brand assets are committed.

### 2.4 Internationalisation (planned)

English, Malayalam, Tamil and Hindi are planned. The config already lists them
with language codes `en`, `ml`, `ta` and `hi`. A future `public/js/i18n/` module
will hold translation dictionaries and a language switcher. Page markup should
use translation keys rather than hardcoded business copy so that all four
languages can be reviewed by the owner before launch.

## 3. Firebase services

| Service | Intended use | Current state |
| --- | --- | --- |
| Hosting | Public pages, admin shell, 404 page | Configured with `/admin` rewrite |
| Authentication | Staff-only Email/Password sign-in | Client shell ready; console setup pending |
| Cloud Firestore | Reservations, separate inventories, payments, audit logs | Deny-all rules deployed shape only |
| Cloud Functions | All privileged and canonical writes | Folder reserved; no functions wired |
| Storage | Private uploads such as payment evidence | Deny-all rules |
| Security Rules | Role and function-only authorization | Deny everything |

### 3.1 Firestore shape (planned, no documents committed)

| Collection | Purpose | Intended writer |
| --- | --- | --- |
| `reservations` | One customer reservation per booking reference, with service lines tagged by category | Cloud Functions only |
| `inventoryAccommodation` | Rooms/cottages availability and attributes | Cloud Functions / owner-controlled admin |
| `inventoryCamping` | Campsites and camping capacity | Cloud Functions / owner-controlled admin |
| `inventoryRestaurant` | Table or meal-slot capacity | Cloud Functions / restaurant staff via trusted function |
| `inventoryExperiences` | Trekking, nature walks, BBQ, bonfire, kids activities and picnic capacity | Cloud Functions / owner-controlled admin |
| `payments` | Manual UPI verification records and evidence references | Cloud Functions / authorised verifier |
| `staffUsers` | Staff profile metadata; roles remain Auth custom claims | Cloud Functions / owner |
| `auditLogs` | Append-only record of privileged actions | Cloud Functions only |
| `siteContent` | Owner-managed copy and per-language variants | Owner via trusted function |

The exact document fields are deliberately left for the inventory and booking
stages. No prices, counts, categories, policies or sample records are invented
here.

### 3.2 One reservation, separate inventories

A customer sees **one reservation** and **one booking reference** even when the
stay combines several services. Internally:

- each selected service line records its inventory category
  (`accommodation`, `camping`, `restaurant` or `experience`);
- the corresponding inventory collection is checked and reserved independently;
- the booking reference is generated by a Cloud Function, not by the browser;
- compatibility rules (which services may combine) are enforced server-side;
- partial failure must not silently confirm any part of the reservation.

This keeps day-visitor and staying-guest inventory separate while still giving
the guest a single itinerary.

## 4. Security boundaries

| Boundary | Rule |
| --- | --- |
| Public website | Static assets only. No direct Firestore reads or writes in this stage. |
| Web config | Browser-visible identifiers only. Not a secret store. |
| Staff sign-in | Email/Password accounts created by the owner; no public registration UI. |
| Role claims | `owner`, `reception`, `restaurant` set by a trusted admin path, never by the browser. |
| Admin UI | Hides or shows controls for convenience; it is not an authorization layer. |
| Firestore | Deny-by-default now. Later rules use verified claims and function-only paths. |
| Cloud Functions | Use Admin SDK and are the only place for canonical booking, inventory and payment state changes. |
| Storage | Deny-by-default now. Public media stays in Hosting; private evidence uses controlled paths later. |
| Payment | UPI happens outside the site. No credentials or UPI IDs in the repository. |
| Confirmation | Only a trusted verification step may set a reservation to confirmed. |

### Payment verification workflow (planned)

```text
draft created
  → awaiting_payment
  → payment_submitted (customer supplies evidence through an approved path)
  → payment_verified (authorised staff)
  → confirmed
```

A rejected or cancelled state may be added when policies are supplied. The
browser can never jump directly from `awaiting_payment` to `confirmed`.

## 5. Major workflows

### 5.1 Public browsing (later stage)

A visitor reads public pages served by Hosting. Content may come from static
modules initially and from owner-managed `siteContent` documents later. All
copy and media require owner approval.

### 5.2 WhatsApp enquiry (later stage, no automation)

If a verified WhatsApp link is supplied, the site can offer an enquiry handoff
that opens WhatsApp with a pre-filled message. The link stays hidden while the
contact value is empty. No automated replies, bots or webhooks are in scope for
the first release.

### 5.3 Online reservation (later stage)

1. Guest selects compatible services.
2. A Cloud Function creates a draft, checks each inventory collection and
   returns the shared booking reference.
3. Guest receives payment instructions from owner-approved content.
4. No confirmation is issued until verification succeeds.

### 5.4 Staff access (foundation shell present)

1. Staff opens `/admin/` and signs in with Email/Password.
2. The browser reads the ID token to display a role label.
3. Every privileged action still goes through rules or a Cloud Function that
   re-checks the token on the server.

### 5.5 Owner content management (later stage)

The owner edits language-specific copy and uploads approved media. Public
assets are served by Hosting; restricted files use Storage with explicit rules.

## 6. Environments and deployment

- **Local:** static server plus placeholder config; no network calls.
- **Preview:** Firebase Hosting preview channels for review before launch.
- **Production:** `firebase deploy --only hosting,firestore:rules,storage`.
  Functions are added to `firebase.json` when their first implementation lands.

Rules and config changes are deployed with the site so the authorization model
travels with the code. Service-account keys and payment credentials are never
part of a deploy bundle from this repository.

## 7. Deliberately absent in this stage

- Room/campsite categories, counts, prices, policies or availability data
- Contact details, WhatsApp links, UPI IDs, coordinates, testimonials or photos
- Booking, inventory, payment or WhatsApp automation logic
- Translation dictionaries and language switcher
- Admin dashboards beyond sign-in
- Cloud Function endpoints and non-deny security rules
