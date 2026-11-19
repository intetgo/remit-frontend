# Remit — frontend setup

Next.js 15 App Router / TypeScript / Tailwind CSS. Requires the backend running on `http://localhost:8080`.

See [`../remit-backend/SETUP.md`](../remit-backend/SETUP.md) to get the backend and its infrastructure running first.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ (20.x recommended) |
| npm | bundled with Node |

---

## 1. Install dependencies

```bash
cd remit-frontend
npm install
```

---

## 2. Create `.env.local`

```bash
cp .env.local.example .env.local   # if the example exists, otherwise create it manually
```

Minimum contents:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_<your-stripe-publishable-key>
```

The Stripe publishable key is the `pk_test_…` key from your Stripe dashboard (safe to commit for test keys, but keep it out of production builds without env injection). If you do not have a Stripe key, card-save flows will not work but the rest of the app will.

---

## 3. Run the dev server

```bash
npm run dev
```

The app is available at `http://localhost:3000`.

---

## 4. Create an account and log in

1. Navigate to `http://localhost:3000/register`
2. Register with any email and a password ≥ 8 characters
3. Check MailHog (`http://localhost:8025`) for the verification email and click the link
4. Log in at `http://localhost:3000/login`

---

## Key pages

| Path | Description |
|------|-------------|
| `/dashboard` | Home — balance, recent transfers |
| `/send` | New transfer quote + funding flow |
| `/transfers` | Transfer history |
| `/recipients` | Saved recipients |
| `/kyc` | Identity verification (KYC upgrade) |
| `/notifications` | Full notification history |
| `/settings` | Profile, password, saved cards |
| `/admin/compliance` | Compliance review queue (admin only) |
| `/admin/users` | User search and inspection (admin only) |

---

## Admin access

Admin pages redirect non-admin users to `/dashboard`. To get admin access, follow the **Bootstrap the first admin account** steps in [the backend SETUP.md](../remit-backend/SETUP.md#3-bootstrap-the-first-admin-account), then sign in with that account.

---

## Other scripts

```bash
npm run build    # production build
npm run lint     # ESLint
```
