# Cloud Functions (reserved)

This folder is reserved for Firebase Cloud Functions. No functions are wired in
`firebase.json` yet, and no endpoints exist in this foundation stage.

Planned privileged responsibilities (not implemented here):

- create a reservation draft and generate the shared booking reference
- check and reserve capacity in each separate inventory collection
- accept manual UPI payment evidence and let authorised staff verify it
- mark a reservation confirmed **only after** payment verification
- set staff role custom claims and write append-only audit logs

Keep all canonical booking, inventory and payment writes in Cloud Functions.
Never trust the browser for these decisions.
