import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadString, getBytes } from "firebase/storage";

const projectId = "demo-bethel-organic-farm";
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
    storage: { rules: fs.readFileSync(new URL("../storage.rules", import.meta.url), "utf8") },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "bookings/owned-by-ada"), { customerUid: "ada", bookingStatus: "awaiting_payment" });
    await setDoc(doc(context.firestore(), "bookings/private-to-bo"), { customerUid: "bo", bookingStatus: "awaiting_payment" });
    await setDoc(doc(context.firestore(), "publicServices/experience/items/walk"), { isPublished: true, name: "Walk" });
    await setDoc(doc(context.firestore(), "publicServices/experience/items/unpublished"), { isPublished: false, name: "Hidden" });
    await setDoc(doc(context.firestore(), "serviceCatalog/experience/items/walk"), { isBookable: true, unitPricePaise: 10000, currency: "INR" });
  });
});

after(async () => env?.cleanup());

test("public visitors can read only published service content", async () => {
  const guest = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(guest, "publicServices/experience/items/walk")));
  await assertFails(getDoc(doc(guest, "publicServices/experience/items/unpublished")));
  await assertFails(getDoc(doc(guest, "serviceCatalog/experience/items/walk")));
  await assertFails(setDoc(doc(guest, "publicServices/experience/items/new"), { isPublished: true }));
});

test("customers can read only their own booking and cannot change it", async () => {
  const ada = env.authenticatedContext("ada").firestore();
  await assertSucceeds(getDoc(doc(ada, "bookings/owned-by-ada")));
  await assertFails(getDoc(doc(ada, "bookings/private-to-bo")));
  await assertFails(setDoc(doc(ada, "bookings/owned-by-ada"), { customerUid: "ada", bookingStatus: "confirmed" }));
});

test("booking staff can read bookings while restaurant staff cannot", async () => {
  const bookingStaff = env.authenticatedContext("reception", { staffRole: "booking" }).firestore();
  const restaurantStaff = env.authenticatedContext("kitchen", { staffRole: "restaurant" }).firestore();
  await assertSucceeds(getDoc(doc(bookingStaff, "bookings/private-to-bo")));
  await assertFails(getDoc(doc(restaurantStaff, "bookings/private-to-bo")));
});

test("private payment evidence remains inaccessible to clients", async () => {
  const customerStorage = env.authenticatedContext("ada").storage();
  await assertFails(uploadString(ref(customerStorage, "payment-evidence/owned-by-ada/proof.txt"), "proof"));
  await assertFails(getBytes(ref(customerStorage, "payment-evidence/owned-by-ada/proof.txt")));
});

test("customers cannot read payment and role records or assign roles", async () => {
  const customer = env.authenticatedContext("ada").firestore();
  await assertFails(getDoc(doc(customer, "payments/owned-by-ada")));
  await assertFails(getDoc(doc(customer, "staffRoles/ada")));
  await assertFails(setDoc(doc(customer, "staffRoles/ada"), { staffRole: "owner" }));
});
