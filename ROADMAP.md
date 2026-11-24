# Implementation roadmap

## How to read this

Stage 0 is complete in this repository. The later stage names below are an
architect’s proposed mapping of the remaining prompt pack. The exact prompt
titles and order were not supplied with the foundation prompt, so confirm this
sequence with the owner before starting any later stage.

Nothing below should begin automatically after approval of the foundation.

| Stage | Proposed prompt-pack topic | Outcome | Depends on | Status |
| --- | --- | --- | --- | --- |
| 0 | Foundation and guardrails | Folder structure, starter pages, placeholders, deny-all rules, docs | — | **Complete** |
| 1 | Visual system and design tokens | Final Cinematic Wilderness palette, typography, spacing, motion rules and reusable components | Owner approval of visual direction | Not started |
| 2 | Public information architecture | Home, stays, camping, dining, experiences, day visits, location and enquiry page shells | Owner-supplied copy and approved media | Not started |
| 3 | Multi-language foundation | `en`, `ml`, `ta`, `hi` dictionaries, language switcher, translated navigation and status strings | Stage 2 content keys; translation review | Not started |
| 4 | Contact and WhatsApp enquiry handoff | Verified contact block, optional WhatsApp link builder, no automation | Owner-supplied contact details | Not started |
| 5 | Firebase Auth and staff roles | Console setup, manual staff creation, custom claims for Owner / Reception / Restaurant, audit-ready sign-in | Stage 0 config; owner staff list | Not started |
| 6 | Inventory catalogue setup | Separate accommodation, camping, restaurant and experience collections with owner-approved fields | Owner-supplied categories, counts, prices, policies | Not started |
| 7 | Reservation builder and booking reference | One reservation combining compatible services, server-side reference generation, per-inventory checks | Stages 5–6; compatibility rules | Not started |
| 8 | UPI instructions and manual verification | Owner-approved payment display, evidence path, staff verification action, confirmation only after verification | Owner-supplied UPI process; Stage 7 | Not started |
| 9 | Staff dashboards | Reception/booking and restaurant views, day-visitor handling, status filters and basic reporting | Stages 5–8 | Not started |
| 10 | Content and media management | Owner-editable copy, approved gallery, testimonials only if supplied, Storage rules | Stages 2–5 | Not started |
| 11 | Hardening, testing and launch | Rules review, emulator tests, accessibility, performance, SEO, preview channels, production deploy | All functional stages | Not started |
| 12 | Post-launch iteration | Measure real usage, decide on future WhatsApp automation or extra languages | Live feedback | Not started |

## Stage gates

- **Gate A — before public content:** owner approves visual tokens and supplies
  verified copy, imagery and contact details.
- **Gate B — before booking logic:** roles, inventory fields, pricing and
  combination rules are confirmed; security rules are written and tested.
- **Gate C — before taking payments:** UPI details and the manual verification
  procedure are documented and reviewed; no booking can be confirmed by a
  client action.
- **Gate D — before launch:** deny-by-default assumptions are replaced only
  with tested, least-privilege rules.

## Explicitly out of scope for the first release

- WhatsApp bots, automated replies or webhooks
- Online payment gateways or automatic UPI confirmation
- Public self-registration for staff
- Any invented room, price, policy, testimonial, photo or coordinate data

Stop after Stage 0 and wait for approval.
