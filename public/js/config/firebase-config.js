/**
 * Public Firebase web configuration placeholders.
 *
 * These values are browser-visible identifiers, not secrets. They are safe to
 * ship to the public website. Real service-account keys and payment credentials
 * must NEVER be placed in this file or anywhere in the repository.
 *
 * Replace every REPLACE_* value before deploying. See README.md for the
 * step-by-step source of each value.
 */
export const firebaseConfig = Object.freeze({
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_PROJECT_ID",
  storageBucket: "REPLACE_WITH_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID",
});

const placeholderPattern = /^REPLACE_/;

/** True only when every placeholder has been replaced. */
export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) =>
    typeof value === "string" &&
    value.trim().length > 0 &&
    !placeholderPattern.test(value),
);

/** Confirmed project facts only. Empty contact values stay hidden until supplied. */
export const siteConfig = Object.freeze({
  name: "Bethel Organic Farm",
  location: "Dhoni, Palakkad, Kerala, India",
  languages: Object.freeze([
    { code: "en", label: "English" },
    { code: "ml", label: "Malayalam" },
    { code: "ta", label: "Tamil" },
    { code: "hi", label: "Hindi" },
  ]),
  contact: Object.freeze({
    whatsappUrl: "",
    email: "",
    phone: "",
  }),
});
