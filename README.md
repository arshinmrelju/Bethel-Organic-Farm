# Bethel Organic Farm

> Welcome, Thomas — this repository now contains the foundation scaffold for
> the website and booking platform.

## Project status

**Foundation stage only.** The structure, styling tokens, Firebase placeholders
and deny-by-default security rules are in place. The public content, full
booking flow, payments and admin dashboards are intentionally **not built yet**.
See [ROADMAP.md](./ROADMAP.md) for the remaining stages.

## Confirmed direction

- **Frontend:** HTML5, CSS3 and vanilla JavaScript ES modules. No React,
  Next.js, Vue, Angular or other frontend framework.
- **Backend:** Firebase — Cloud Firestore, Authentication, Cloud Functions,
  Storage and Hosting.
- **Visual mood:** “Cinematic Wilderness” — deep forest greens, warm ivory,
  earthy neutrals, editorial typography and restrained motion.
- **Location:** Dhoni, Palakkad, Kerala, India.
- **Planned languages:** English, Malayalam, Tamil and Hindi.
- **Audiences:** staying guests and day visitors.
- **Staff roles:** Owner, Reception/Booking Staff and Restaurant Staff.
- **Booking:** online booking plus WhatsApp enquiry/assisted booking. WhatsApp
  automation is **not** in the first release.
- **Payments:** direct UPI with hybrid/manual verification. A booking is never
  marked confirmed until payment has been verified by authorised staff.
- **Inventory:** accommodation, camping, restaurant and experiences are tracked
  separately, but compatible services may share one reservation and booking
  reference.

## Repository layout

```text
.
├── .firebaserc                 # Firebase project alias (placeholder)
├── .gitignore                  # Secrets, dependencies and generated output
├── ARCHITECTURE.md             # Systems, boundaries and workflows
├── ROADMAP.md                  # Remaining implementation stages
├── README.md                   # This file
├── firebase.json               # Hosting, Firestore rules and Storage rules
├── firestore.indexes.json      # Firestore indexes (empty for now)
├── firestore.rules             # Deny-by-default starter rules
├── storage.rules               # Deny-by-default starter rules
├── functions/
│   └── README.md               # Reserved for Cloud Functions
└── public/
    ├── 404.html
    ├── index.html              # Public home page
    ├── admin/
    │   └── index.html          # Staff sign-in shell
    ├── assets/
    │   └── README.md           # No media committed yet
    ├── css/
    │   ├── tokens.css          # Design tokens and minimal reset
    │   ├── site.css            # Public page styles
    │   └── admin.css           # Staff area styles
    └── js/
        ├── config/
        │   └── firebase-config.js
        ├── firebase/
        │   └── initialize.js   # Single shared Firebase app instance
        ├── pages/
        │   └── home.js         # Public home page entry point
        ├── admin/
        │   └── dashboard.js    # Staff sign-in entry point
        └── ui/
            └── status.js       # Shared status message helper
```

## Run locally

### Prerequisites

- A modern browser with ES module and import-map support (current Chrome,
  Edge, Firefox or Safari).
- A local static server. Use one of:
  - Python 3: `python -m http.server 8080 --directory public`
  - Node.js: `npx serve public`
  - VS Code: “Live Server” extension, serving the `public` folder.

> Opening `index.html` with a `file://` URL will not work reliably because
> browsers block ES module imports from the file system. Use a local server.

### Steps

1. From the repository root, start a static server, for example:

   ```powershell
   python -m http.server 8080 --directory public
   ```

2. Open <http://localhost:8080/> for the public shell.
3. Open <http://localhost:8080/admin/> for the staff shell.
4. Confirm the pages load and show the “starter mode” notice. This means the
   module structure and styling work without any Firebase project attached.

No npm install or build step is required for the frontend at this stage.

## Supply the Firebase configuration

The file [`public/js/config/firebase-config.js`](./public/js/config/firebase-config.js)
contains clearly named placeholders. Replace every `REPLACE_*` value with the
values from the Firebase console:

| Key | Where to find it |
| --- | --- |
| `apiKey` | Firebase console → Project settings → Your apps → Web app |
| `authDomain` | Usually `<projectId>.firebaseapp.com` |
| `projectId` | Firebase console → Project settings → Project ID |
| `storageBucket` | The bucket shown in the Web app config |
| `messagingSenderId` | Web app config |
| `appId` | Web app config |

Also replace `REPLACE_WITH_FIREBASE_PROJECT_ID` in [`.firebaserc`](./.firebaserc),
or run `firebase use --add` and select the real project.

These web config values are browser-visible identifiers, not secrets. **Never**
commit a service-account JSON file, private key, UPI credential or payment
secret. Common filenames are already excluded in [`.gitignore`](./.gitignore).

### Firebase console setup still required

1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create staff accounts manually in the console. Do not expose a public
   sign-up form.
4. Assign roles with custom claims: `owner`, `reception` or `restaurant`.
   A trusted admin path must set these claims; the browser must never do it.
   The claim setter is a later roadmap stage.
5. Create Cloud Firestore and Cloud Storage instances.
6. Deploy the deny-by-default rules before adding any data.
7. Supply the owner-approved contact details before showing any WhatsApp,
   phone or email link. They are intentionally empty in the config.

## Deploy

Firebase CLI is needed only for deployment (and later for Cloud Functions):

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only hosting,firestore:rules,storage
```

Cloud Functions are reserved in `functions/README.md` but are **not** wired
into `firebase.json` yet. They will be added when the first trusted function is
implemented.

## Security notes

- `firestore.rules` and `storage.rules` deny all access. Do not loosen them to
  make a UI work; add precise, role-aware rules in a later stage.
- The staff area’s client-side sign-in check is only a convenience. Real
  authorization is enforced by Firebase rules and Cloud Functions.
- No booking, inventory or payment logic exists yet, so there is no risk of a
  browser marking a reservation confirmed.

## Next steps

Read [ARCHITECTURE.md](./ARCHITECTURE.md) for the planned system boundaries and
[ROADMAP.md](./ROADMAP.md) for the order of remaining work. Do not begin the
next stage until the owner approves this foundation and supplies the missing
inputs listed below.

## Decisions needed from the owner

- Verified phone/email and the exact WhatsApp number or link.
- UPI details and the manual verification process, kept out of the repository
  until a secure approach is agreed.
- Actual inventory categories, counts, pricing and booking policies.
- Named staff and their roles.
- Approved photography, copy and any testimonials.
- Malayalam, Tamil and Hindi translations or approval to draft them.
- Rules for combining services into one reservation and for day-visitor slots.

The original repository contained only the note “Welcome Thomas / Hehe”; the
greeting has been retained above while replacing the placeholder content.
