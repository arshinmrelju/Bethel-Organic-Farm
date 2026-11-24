import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth, isFirebaseConfigured } from "../firebase/initialize.js";
import { setStatusMessage } from "../ui/status.js";

const elements = {
  message: document.querySelector("#auth-message"),
  form: document.querySelector("#sign-in-form"),
  email: document.querySelector("#email"),
  password: document.querySelector("#password"),
  panel: document.querySelector("#signed-in-panel"),
  userEmail: document.querySelector("#user-email"),
  userRole: document.querySelector("#user-role"),
  signOutButton: document.querySelector("#sign-out-button"),
};

/**
 * Role labels are display-only. Real authorization lives in Firestore rules
 * and Cloud Functions, which read trusted custom claims from the ID token.
 */
async function renderSignedInUser(user) {
  const tokenResult = await getIdTokenResult(user);
  const role = tokenResult.claims.role || "unassigned";

  elements.userEmail.textContent = user.email || "unknown account";
  elements.userRole.textContent = role;
  elements.form.hidden = true;
  elements.panel.hidden = false;
  setStatusMessage(elements.message, "Signed in.", "success");
}

function renderSignedOut() {
  elements.form.hidden = false;
  elements.panel.hidden = true;
  setStatusMessage(
    elements.message,
    "Sign in with a staff account created by the owner.",
  );
}

function showConfigurationNotice() {
  elements.form.hidden = true;
  elements.panel.hidden = true;
  setStatusMessage(
    elements.message,
    "Staff sign-in is unavailable until Firebase configuration is supplied. See README.md.",
    "error",
  );
}

function watchAuthState() {
  onAuthStateChanged(
    auth,
    (user) => {
      if (user) {
        renderSignedInUser(user).catch((error) => {
          setStatusMessage(elements.message, error.message, "error");
        });
      } else {
        renderSignedOut();
      }
    },
    (error) => {
      setStatusMessage(elements.message, error.message, "error");
    },
  );
}

elements.form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatusMessage(elements.message, "Signing in…");

  try {
    await signInWithEmailAndPassword(
      auth,
      elements.email.value.trim(),
      elements.password.value,
    );
    elements.form.reset();
  } catch (error) {
    setStatusMessage(elements.message, error.message, "error");
  }
});

elements.signOutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    setStatusMessage(elements.message, error.message, "error");
  }
});

if (!isFirebaseConfigured || !auth) {
  showConfigurationNotice();
} else {
  watchAuthState();
}
