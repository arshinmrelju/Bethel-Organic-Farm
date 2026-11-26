import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const ownerUid = process.env.BETHEL_OWNER_UID;
if (!projectId || !ownerUid) {
  throw new Error("Set FIREBASE_PROJECT_ID and BETHEL_OWNER_UID after confirming the Firebase project and owner account.");
}

initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();
const db = getFirestore();
const user = await auth.getUser(ownerUid);
await auth.setCustomUserClaims(ownerUid, { ...user.customClaims, staffRole: "owner" });
await db.collection("staffRoles").doc(ownerUid).set({
  staffRole: "owner",
  bootstrapSource: "manual-owner-bootstrap",
  updatedAt: FieldValue.serverTimestamp(),
});
await db.collection("auditLogs").add({
  action: "staff.owner_bootstrapped",
  actorUid: ownerUid,
  actorRole: "owner",
  targetUid: ownerUid,
  nextState: "owner",
  createdAt: FieldValue.serverTimestamp(),
});
console.log(`Owner role initialized for Firebase user ${ownerUid} in project ${projectId}.`);
