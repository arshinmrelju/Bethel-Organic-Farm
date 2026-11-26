# Notification and language setup

## Current state

- The public site and booking preview support English, Malayalam, Tamil, and Hindi for selected navigation, headline, visit-type, and form-control labels.
- English is the default and the fallback for any missing dictionary key.
- A guest's language choice is saved in that browser only. Signed-in customer preference storage is prepared in the backend; account sign-in is not connected to the current website.
- Currency remains integer paise in storage. Date and currency display helpers use the chosen locale, with farm service dates anchored to `Asia/Kolkata`.
- Accommodation, experience, menu, package, policy, and FAQ copy has locale fields defined in `content/locales.json`. Owner source content and translations remain pending; untranslated fields stay null and should render from English.
- Payment, refund, cancellation, safety, and legal instructions remain in English until a qualified human translation is supplied and owner-reviewed. Machine-generated translations must not be published as approved instructions.

## Translation coverage

`public/js/i18n.js` is the stable-key UI dictionary. It provides matching keys for the four supported locales and includes English fallback behavior. The present website coverage is intentionally a curated core interface, not a complete translation of all marketing copy. Content still awaiting source/translation includes most service descriptions, FAQs, booking explanations, and all owner policies. Add keys to all four dictionaries and update the coverage test when translating more interface copy.

## Preferences and notification events

`functions/notifications.js` validates an authenticated customer's locale, optional channel preferences, and explicit on/off preferences for the supported event types. New preferences default to no event opt-ins and no selected channels. `saveNotificationPreferences` and `getNotificationPreferences` can be connected when customer authentication is available. Direct Firestore access remains denied.

Candidate event types are booking request received, payment evidence submitted, payment verified/rejected, booking confirmed/cancelled, arrival reminder, experience/food preorder update, and refund status update. A provider-neutral outbox record shape includes a stable SHA-256 idempotency key, template key, recipient UID, booking reference, locale, status, attempt count, and safe error fields. The builder stores only a booking reference in message data; it excludes payment references, screenshots, and unnecessary contact details.

No notification outbox worker is enabled. A generated record stays `held_for_channel_setup` with `channel: null`. Email, SMS, push, and messaging providers have not been selected, no customer channel consent is assumed, and no messages are sent. WhatsApp automation remains out of scope. Choose channels, consent copy, templates, retry/retention rules, and a provider with the owner before implementing delivery.
