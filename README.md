# RaktoSheba

A backend-only REST API for a **Blood Donation & Emergency Platform** — hospitals post urgent blood requests, the system matches them to compatible, eligible, nearby donors using an ABO/Rh compatibility engine and geolocation, and donors accept requests through a transaction-locked flow that makes double-assignment impossible.

Built for Apollo Level 2 Batch 7, Assignment 6.

## Live deployment

- **API**: https://raktosheba-backend.vercel.app
- **Interactive docs**: https://raktosheba-backend.vercel.app/api/v1/docs

## Tech stack

| Layer | Technology |
|---|---|
| Runtime / Framework | Node.js, TypeScript, Express |
| Database / ORM | PostgreSQL, Prisma |
| Validation | Zod |
| Auth | JWT (access + refresh), bcrypt, Google OAuth 2.0 |
| Payments | Stripe (Checkout Sessions + webhooks) |
| File storage | Cloudinary (via Multer) |
| Email | Nodemailer |
| Docs | Swagger / OpenAPI 3.0 |
| Security | Helmet, express-rate-limit, CORS |

## Core features

- **Three enforced roles** — Admin, Hospital, Donor — with strict role-based middleware
- **Email/password + Google social login**, JWT access/refresh tokens
- **Blood compatibility engine** — ABO/Rh donor-recipient matching
- **Geographic matching** — Haversine distance, donors sorted by proximity to a request
- **Donor eligibility rule** — 90-day minimum gap between donations, enforced server-side
- **Race-condition-safe accept flow** — a unique constraint + Prisma transaction guarantees a request can never be matched to two donors at once
- **Real Stripe payments** — Checkout session creation, signed webhook verification, live status tracking (no fake/manual "mark as paid")
- **Email notifications** — donors are notified automatically when a compatible request is verified
- **File uploads** — donor profile photos and hospital verification documents, stored on Cloudinary
- **Soft deletes** — donor/hospital/request records are never hard-deleted
- **Audit log** — every admin action and request status change is recorded with actor, action, and target
- **Pagination, filtering, sorting, and search** across list endpoints
- **Consistent response envelope** — `{ success, message, data }` on success, `{ success, message, errors }` on error
- **Rate limiting, Helmet, and configurable CORS**

## API documentation

Interactive Swagger UI, covering all 39 endpoints:

```
GET /api/v1/docs        # interactive UI
GET /api/v1/docs.json   # raw OpenAPI 3.0 spec
```

A Postman collection is also available and kept in sync with the same endpoints.

## Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g. [Neon](https://neon.tech))

### Setup

```bash
git clone https://github.com/RaheelArfeen/RaktoSheba.git
cd RaktoSheba
npm install
cp .env.example .env   # then fill in real values, see below
npx prisma migrate deploy
npm run dev
```

The API runs at `http://localhost:8000` by default (`/api/v1/...`).

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Server port |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | JWT signing secrets |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (e.g. `15m`, `30d`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth credentials |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Outbound email (notifications) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe payments |
| `CLIENT_SUCCESS_URL`, `CLIENT_CANCEL_URL` | Stripe Checkout redirect targets |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | File uploads |

SMTP and Stripe webhook secrets are optional in development — the mailer logs and no-ops without SMTP credentials, and the webhook route reports a clear error without a signing secret, rather than crashing.

### Scripts

```bash
npm run dev      # start with hot reload (ts-node-dev)
npm run build    # compile TypeScript to dist/
npm start        # run the compiled build
```

## Roles

| Role | Can do |
|---|---|
| **Admin** | Verify hospitals, ban/unban users, view analytics and audit logs, verify/cancel any request |
| **Hospital** | Create/verify-pending blood requests, view matched donors, manage own profile |
| **Donor** | Manage own profile & availability, accept compatible requests, view own notifications/payments |

## Core flow

```
Hospital creates request
        │
        ▼
Admin verifies ──────► Notification fan-out to compatible, eligible, nearby donors
        │
        ▼
Donor views matches (ABO/Rh compatible + available + eligible, sorted by distance)
        │
        ▼
Donor accepts ──────► Transaction-locked: prevents two donors accepting the same request
        │
        ▼
Donation scheduled, request marked MATCHED
```

## Project structure

```
src/
├── app.ts                    # Express app: middleware, docs, error handling
├── server.ts                 # Entry point
├── config/                   # Prisma, Stripe, Cloudinary, Passport, Mailer clients
├── docs/                     # OpenAPI spec
└── app/
    ├── middlewares/          # auth, validateRequest, upload, globalErrorHandler
    ├── routes/                # central route aggregator
    ├── utils/                 # AppError, catchAsync, sendResponse, pagination
    └── modules/
        ├── auth/
        ├── user/
        ├── donor/
        ├── hospital/
        ├── bloodRequest/
        ├── notification/
        ├── payment/
        ├── admin/
        └── auditLog/
prisma/
├── schema.prisma
└── migrations/
```

## License

ISC
