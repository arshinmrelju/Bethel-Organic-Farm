# Design system — Cinematic Wilderness

Status: **v0.1, complete for review and awaiting owner approval.** This is a
visual system and component library only. It does not add business content,
photography, a logo, booking logic or payment behaviour.

## Files

| File | Purpose |
| --- | --- |
| `public/css/tokens.css` | Central custom properties, reset, base typography, reduced-motion rule |
| `public/css/components.css` | Reusable public and admin HTML/CSS patterns |
| `public/css/site.css` | Public home and 404 page composition |
| `public/css/admin.css` | Staff-area density and sign-in composition |
| `public/css/demo.css` | Layout for the design-system preview only |
| `public/design-system.html` | Preview page showing tokens and components |
| `public/js/demo.js` | Tiny interaction that demonstrates the loading state |
| `public/index.html`, `public/404.html`, `public/admin/index.html` | Updated to consume the shared system |

Open the preview at `/design-system.html` through a local static server.

## Token inventory

### Colour palette

| Group | Tokens |
| --- | --- |
| Forest and botanical | `--color-forest-950`, `--color-forest-900`, `--color-forest-800`, `--color-forest-700`, `--color-forest-600`, `--color-forest-500`, `--color-moss-500`, `--color-moss-300` |
| Ivory and stone | `--color-ivory-50`, `--color-ivory-100`, `--color-ivory-200`, `--color-stone-100`, `--color-stone-200`, `--color-stone-300`, `--color-stone-400`, `--color-stone-500`, `--color-stone-600` |
| Earth and gold | `--color-clay-700`, `--color-clay-600`, `--color-clay-500`, `--color-gold-700`, `--color-gold-500`, `--color-gold-300` |

### Semantic colour aliases

`--color-text`, `--color-text-muted`, `--color-text-on-dark`,
`--color-text-on-dark-soft`, `--color-surface`, `--color-surface-raised`,
`--color-surface-sunken`, `--color-surface-dark`, `--color-border`,
`--color-border-strong`, `--color-focus`, `--color-primary`,
`--color-primary-hover`, `--color-primary-active`, `--color-accent`,
`--color-accent-strong`, `--color-accent-gold`, `--color-success`,
`--color-success-bg`, `--color-warning`, `--color-warning-bg`, `--color-error`,
`--color-error-bg`, `--color-info`, `--color-info-bg`.

Components should prefer these aliases over raw palette values.

### Typography

| Group | Tokens |
| --- | --- |
| Families | `--font-display`, `--font-body`, `--font-mono` |
| Sizes | `--font-size-2xs`, `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`, `--font-size-3xl`, `--font-size-4xl` |
| Weights | `--font-weight-regular`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold` |
| Line heights | `--line-height-tight`, `--line-height-heading`, `--line-height-body`, `--line-height-relaxed` |
| Letter spacing | `--letter-spacing-tight`, `--letter-spacing-normal`, `--letter-spacing-wide`, `--letter-spacing-wider` |

The display family is a local editorial serif stack. The body family is a
local system UI stack. No external font download is required.

### Spacing

`--space-0`, `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-5`,
`--space-6`, `--space-7`, `--space-8`, `--space-9`, `--space-10`, `--space-11`,
`--space-12`, `--space-section`, `--space-section-lg`, `--space-stack`.

### Radii

`--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`,
`--radius-pill`.

### Shadows

`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-focus`.

### Containers

`--container-sm`, `--container-md`, `--container-lg`, `--container-xl`,
`--container-gutter`.

### Transitions

`--duration-instant`, `--duration-fast`, `--duration-base`, `--duration-slow`,
`--ease-standard`, `--ease-out`, `--transition-colors`, `--transition-motion`.

### Z-index layers

`--z-base`, `--z-raised`, `--z-sticky`, `--z-header`, `--z-overlay`,
`--z-modal`, `--z-toast`, `--z-skip`.

### Breakpoint references

`--breakpoint-sm` (36rem), `--breakpoint-md` (48rem), `--breakpoint-lg`
(64rem), `--breakpoint-xl` (80rem). Media queries use the literal values;
these properties document the scale.

### Compatibility aliases

`--step-0`, `--step-1`, `--step-2`, `--step-3`, `--shell-width`,
`--shadow-soft`, `--color-line`. These preserve the earlier foundation markup
and can be removed once no page references them.

## Reusable components

| Component | Classes / elements |
| --- | --- |
| Layout | `.shell`, `.shell--narrow`, `.shell--wide`, `.section`, `.section--tight`, `.section--flush`, `.section__header`, `.section__title`, `.section__lead` |
| Labels | `.eyebrow`, `.eyebrow--inverse`, `.muted`, `.small-note`, `.visually-hidden` |
| Skip link | `.skip-link` |
| Wordmark placeholder | `.wordmark`, `.wordmark__note` |
| Public header and nav | `.site-header`, `.site-header__inner`, `.site-nav`, `.site-nav__list`, `.site-nav__link` |
| Buttons | `.button`, `.button--secondary`, `.button--ghost`, `.button--inverse`, `.button--small`, `.button--block`, `.button--loading`, `.is-loading`, `.button-group`, `.spinner` |
| Links | `.text-link`, `.text-link--quiet`, `.text-link--inverse` |
| Forms | `.form`, `.form--compact`, `.form__row`, `.field`, `.field__label`, `.field__control`, `.field__hint`, `.field__error`, `.is-invalid`, `.is-valid` |
| Cards | `.card`, `.card--interactive`, `.card--quiet`, `.card__content`, `.card__title`, `.card__text`, `.card__meta`, `.card__actions` |
| Image placeholders | `.media-placeholder`, `.media-placeholder__label`, `.media-placeholder--wide`, `.media-placeholder--landscape`, `.media-placeholder--square`, `.media-placeholder--portrait` |
| Badges | `.badge`, `.badge--gold`, `.badge--dark`, `.badge--success`, `.badge--warning`, `.badge--error` |
| Feedback | `.alert`, `.alert--success`, `.alert--warning`, `.alert--error`, `.status-card`, `[data-tone="error"]`, `[data-tone="success"]` |
| Mobile action | `.mobile-action-bar`, `.has-mobile-action` |
| Admin shell | `.admin-shell`, `.admin-sidebar`, `.admin-sidebar__title`, `.admin-nav`, `.admin-nav__list`, `.admin-nav__link`, `.admin-topbar`, `.admin-content` |
| Admin content | `.admin-panel`, `.admin-panel__head`, `.admin-panel__body`, `.admin-stats`, `.admin-stat`, `.admin-stat__label`, `.admin-stat__value`, `.admin-table`, `.admin-empty-state` |
| Staff sign-in | `.admin-signin`, `.admin-signin__panel`, `.admin-signin__intro`, `.admin-signin__body`, `.admin-role-line` |

## Accessible states

- **Hover:** one-pixel lift on interactive cards/buttons; colour shifts stay within the palette.
- **Focus-visible:** two-pixel clay outline, three-pixel offset and a soft gold halo.
- **Active:** movement settles back to zero; no lingering transform.
- **Disabled:** reduced opacity, `not-allowed` cursor, no hover movement.
- **Loading:** `.is-loading` or `.button--loading` hides the label, shows a spinner and sets `pointer-events: none`; JavaScript also sets `aria-busy`.
- **Error:** red border, tinted field background and a visible text message.
- **Success:** green border, tinted field background and a visible confirmation message.
- **Reduced motion:** all animations and transitions collapse to near-zero and smooth scrolling is disabled.

Measured contrast on ivory: body text 14.7:1, muted text 7.2:1, clay link
4.9:1, success 5.7:1, warning 4.5:1 and error 6.8:1. Ivory on forest is
15.9:1. Decorative gold is restricted to borders, large text and dark surfaces.

## Responsive decisions

| Band | Width | Decision |
| --- | --- | --- |
| Mobile | below 48rem | Single column; reduced hero padding; 48px minimum button height; fixed bottom action bar; admin navigation wraps horizontally |
| Tablet | 48–63.99rem | Multi-column token/component grids; two-column form rows where appropriate; compact admin navigation |
| Desktop | 64rem and above | Full container; persistent 15rem admin sidebar; standard editorial spacing |
| Wide | 80rem and above | Container caps at 80rem to preserve comfortable line length |

Mobile booking actions will use `.mobile-action-bar` with safe-area padding.
The demo bar is disabled and labelled as a demo because booking is out of scope.

## Image integrity

There is no real farm photography in the repository. The preview uses
CSS-drawn `.media-placeholder` blocks with visible labels. No stock images,
AI-generated property imagery or fabricated testimonials are present. Replace
each placeholder only with owner-approved Bethel Organic Farm media.

## Deliberately absent

- Final logo or any invented brand mark; the header is a typographic wordmark placeholder
- Any third-party branding
- All eight public pages and the full booking workflow
- Room categories, prices, policies, contact details, UPI IDs, coordinates or testimonials
- External font or icon dependencies

Approval is needed on palette, typography, density and component behaviour
before these patterns are rolled into the wider public site.
