# 🌾 Yousuf Rice — E-Commerce Platform

**Banaye Biryani ko Khaas!**

A full-stack e-commerce platform for ordering premium quality rice online with tier-based pricing, bag-based ordering, GPS location capture, and cash-on-delivery. Built as a pnpm monorepo with a Next.js 16 web app (customer + admin) and an Expo React Native mobile app (iOS + Android), powered by self-hosted Appwrite 1.9.0 TablesDB.

---

## 🧩 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** (Web) | Next.js (App Router, PPR, Turbopack) | 16.2.6 |
| **Frontend** (Mobile) | Expo (React Native, Expo Router) | SDK 56 / RN 0.85 |
| **Language** | TypeScript | 5.9 |
| **Styling** | Tailwind CSS | 4.3 |
| **UI Components** | shadcn/ui (New York), Base UI, Radix | — |
| **Animations** | Motion | 12.40 |
| **Icons** | Lucide React | 1.16 |
| **State Management** | Zustand (persisted) | 5 |
| **Validation** | Zod | 4 |
| **Backend** | Appwrite (self-hosted) | 1.9.0 |
| **Database** | Appwrite TablesDB | — |
| **Storage** | Appwrite Storage (product-images, banner-images buckets) | — |
| **Auth** | Appwrite Account (email/password, sessions, labels) | — |
| **Messaging** | Appwrite Messaging (FCM/APNs — planned) | — |
| **Push (Browser)** | Web Push API + VAPID | — |
| **Email** | Nodemailer (SMTP) | — |
| **AI** | OpenAI Agents SDK | 0.11 |
| **Tracking** | Meta Conversions API + Pixel | — |
| **Payment** | Cash on Delivery (COD) | — |
| **Build** | Turborepo + pnpm | 11.4 |

---

## ✅ Feature Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| Product browsing with tier pricing | ✅ **Live** | 2–4kg, 5–9kg, 10+ kg tiers per product |
| Bag-based ordering (3kg, 5kg, 10kg, 25kg bags) | ✅ **Live** | Auto-calculates bag breakdown from kg quantity |
| Flat price products | ✅ **Live** | Products without tier pricing (e.g. Rs. 495/kg) |
| Shopping cart with bag selection | ✅ **Live** | Zustand store, persisted to localStorage |
| Checkout with address + GPS location | ✅ **Live** | Browser Geolocation API, generates Maps URLs |
| Cash on Delivery (COD) | ✅ **Live** | Only payment method |
| Customer registration (phone + OTP) | ✅ **Live** | Two-step: form → OTP → create user + customer |
| Customer login (email or phone + password) | ✅ **Live** | Phone login looks up email via Appwrite Users API |
| Forgot / reset password | ✅ **Live** | OTP-based via email |
| Customer order list + detail | ✅ **Live** | Paginated, filterable |
| Guest order tracking by phone | ✅ **Live** | `/track-order` |
| User profile editing | ✅ **Live** | Name, phone, email |
| PWA (manifest + install prompt) | ✅ **Live** | Standalone display, 192px + 512px icons |
| Browser push notifications | ✅ **Live** | SW subscription → admin send | VAPID keys |
| Push notification admin panel | ✅ **Live** | Send form + diagnostics at `/admin/notifications` |
| Push notification logging + metrics | ✅ **Live** | `push_notification_log` table, click tracking |
| Admin dashboard (analytics) | ✅ **Live** | Revenue, orders, products, customers, trends |
| Admin product CRUD | ✅ **Live** | Tier pricing, availability, bulk actions |
| Admin product image management | ✅ **Live** | Upload multiple, mark one as primary |
| Admin order management | ✅ **Live** | Status flow (pending → delivered), edit, delete |
| Admin customer management | ✅ **Live** | Search, sort by orders/spent, detail with history |
| Staff performance tracking | ✅ **Live** | Agent order attribution (Saima, Kiran labels) |
| CSV export (orders) | ✅ **Live** | From orders dashboard |
| Loyalty discount system | ✅ **Live** | Discount codes, loyalty popup on order success |
| Cold drink bundle products | ✅ **Live** | Feature-flagged |
| AI Chat (OpenAI Agents) | 🔧 **Broken (web)** / 📋 **Planned (mobile)** | OpenAI Agents SDK integrated but chat is currently broken on web; not yet implemented in mobile app |
| Meta / Facebook tracking | ✅ **Live** | Pixel + Conversions API (ViewContent, AddToCart, Purchase) |
| Multi-domain support | ✅ **Live** | yousufrice.com, ssricemills.com, yousufricemill.com |
| Notification campaigns | 🧪 **Beta** | Table + APIs + Server Actions exist, **no admin UI yet** |
| Push notification templates | 🧪 **Beta** | Schema + functions exist, **no management UI yet** |
| Mobile app (Expo) | 🔧 **In Progress** | Expo SDK 56, native iOS + Android builds. Auth (login/signup), product browsing, cart, checkout, and admin features still under active development |
| Mobile push notifications (FCM/APNs) | 📋 **Planned** | Via Appwrite Messaging + `expo-notifications` |
| Service worker offline caching | 📋 **Planned** | SW currently only handles push events |
| Push user preferences | 🚫 **Inactive** | Schema exists, but `shouldSendToUser` is hardcoded to `true` for sales mode |

### 🚩 Feature Flag System

The platform uses environment variable flags to toggle features on/off without code deploys:

| Flag | Default | Purpose |
|------|---------|---------|
| `NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT` | `false` | Toggles loyalty discount codes + popup on order success |
| `NEXT_PUBLIC_ENABLE_RAMADAN_OFFER` | `true` | Toggles Ramadan promotional offer banners/pricing |
| `NEXT_PUBLIC_ENABLE_COLD_DRINK_BUNDLE` | `false` | Toggles cold drink bundle product cards |
| `NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` | `false` | Toggles entire browser push notification system |
| `NEXT_PUBLIC_ENABLE_POPUP` | (planned) | Toggles announcement popups on homepage |

Toggling a flag to `false` hides its UI elements, disables related API routes, and suppresses associated components at render time.

---

## 🏗️ Project Structure

```
yousuf-rice/
├── apps/
│   ├── web/                    # Next.js 16 web application
│   │   ├── app/                # App Router pages + API routes
│   │   │   ├── (admin)/admin/  # Admin dashboard pages
│   │   │   ├── api/            # Route handlers / API endpoints
│   │   │   ├── auth/           # Login, register, password reset
│   │   │   ├── checkout/       # Checkout + success
│   │   │   ├── orders/         # Customer order list + detail
│   │   │   ├── products/       # Product detail pages
│   │   │   └── ...             # about, contact, profile, special-deals, track-order
│   │   ├── components/         # React components (ui/, admin/, app)
│   │   ├── lib/                # Services, hooks, stores, utilities
│   │   ├── public/             # Static assets + service worker
│   │   ├── types/              # Auto-generated Appwrite types
│   │   └── scripts/            # Build/deploy scripts
│   │
│   └── mobile/                 # Expo React Native mobile app
│       ├── src/
│       │   ├── app/            # Expo Router pages
│       │   ├── components/     # Mobile-specific components
│       │   ├── hooks/          # Mobile-specific hooks
│       │   └── lib/            # Mobile-specific utilities
│       ├── android/            # Native Android project
│       ├── ios/                # Native iOS project
│       └── assets/             # Fonts, icons, splash
│
├── packages/
│   ├── appwrite/               # Appwrite client (web + native variants)
│   ├── types/                  # Shared TypeScript domain types
│   ├── ui/                     # Cross-platform Button component
│   └── utils/                  # Shared utilities (pricing, bags, maps, phone, catalog)
│
├── appwrite.config.json        # Appwrite schema definition (TablesDB + sites + auth)
├── turbo.json                  # Turborepo task orchestration
├── pnpm-workspace.yaml         # pnpm workspace config
├── tsconfig.base.json          # Shared TypeScript config
├── AGENTS.md                   # Detailed project guide for AI agents
├── DESIGN.md                   # Complete design system (colors, typography, components)
├── PUSH_NOTIFICATIONS.md       # Push notification architecture & setup guide
└── PWA_SETUP.md                # PWA & service worker setup guide
```

---

## 🛍️ Customer Features

| Route | Purpose |
|-------|---------|
| `/` | Homepage with hero banner + product listing |
| `/about` | Company information, stats, export markets |
| `/products/[id]` | Product detail with bag selector, images, tier pricing |
| `/special-deals` | Special deals / sale products |
| `/cart` | Shopping cart (or slide-out drawer) |
| `/checkout` | Full checkout form (address, GPS, discount codes, COD) |
| `/checkout/success` | Order confirmation with confetti + loyalty discount popup |
| `/track-order` | Guest order tracking by phone number |
| `/contact` | Contact form + FAQ |
| `/auth/login` | Login (email or phone + password) |
| `/auth/register` | Registration with OTP verification |
| `/auth/forgot-password` | Request password reset via email |
| `/auth/reset-password` | Complete password reset from email link |
| `/orders` | Authenticated customer order history (paginated, filterable) |
| `/orders/[id]` | Single order detail (items, status, address, map) |
| `/profile` | Edit name, phone, email |

---

## 👑 Admin Features

All admin routes require the `admin` label on the Appwrite user.

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard (revenue, orders, products, customers, trends, top products, cache management) |
| `/admin/products` | Product CRUD (grid/table, search, filter, bulk actions) |
| `/admin/products/[id]/images` | Upload product images, mark as primary |
| `/admin/orders` | Order management (status filter, search, edit, delete, CSV export) |
| `/admin/customers` | Customer list with order count + total spent |
| `/admin/customers/[id]` | Customer detail with order history |
| `/admin/notifications` | Send push notifications, diagnostics |
| `/admin/staff-performance` | Agent (Saima/Kiran) performance metrics by date range |
| `/admin/test` | Auth/permission debugging |

Admin permissions use Appwrite **labels** (not preferences):

| Label | Access Level |
|-------|-------------|
| `admin` | Full CRUD on all tables + storage |
| `readonly` | Read-only access to admin pages |

---

## 🌐 API Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `POST /api/admin/graphql` | GraphQL endpoint for admin analytics | Admin |
| `GET /api/admin/stats` | Dashboard statistics (legacy fallback) | Admin |
| `POST /api/admin/products/update` | Product update endpoint | Admin |
| `POST /api/auth/send-verification-otp` | Send OTP for registration | Public |
| `POST /api/auth/send-password-reset-otp` | Send password reset OTP | Public |
| `POST /api/auth/update-password` | Update password | Public |
| `POST /api/send-contact-email` | Contact form email | Auth |
| `POST /api/send-order-confirmation` | Order confirmation email | Auth |
| `POST /api/chat` | AI chat endpoint | Auth |
| `POST /api/meta-events` | Meta Conversions API proxy | Public |
| `POST /api/push/subscribe` | Subscribe to push notifications | Public |
| `POST /api/push/unsubscribe` | Unsubscribe from push | Public |
| `POST /api/push/send` | Send push notification (single) | Admin (unprotected) |
| `POST /api/push/blast` | Batch send to all subscribers | Admin (secret header) |
| `GET /api/push/status` | Push system status | Public (rate-limited) |
| `GET /api/push/stats` | Push notification statistics | Admin |
| `POST /api/push/track` | Track notification interaction | Public (rate-limited) |
| `GET /api/push/health` | Push system health | Admin (secret header) |
| `POST /api/push/cleanup` | Clean up stale subscriptions | Admin (secret header) |
| `POST /api/notifications/campaigns` | Campaign CRUD (server action) | Admin |
| `POST /api/notifications/analytics` | Campaign analytics | Admin |

---

## 📊 TablesDB Schema

All data is stored using Appwrite **TablesDB** (self-hosted 1.9.0). The schema is defined in `appwrite.config.json` and can be applied via Appwrite CLI.

### 1. Products
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `name` | string | ✅ | Product name |
| `description` | string (1000) | ❌ | Product details |
| `base_price_per_kg` | double | ❌ | Flat price if no tiers |
| `has_tier_pricing` | boolean | ✅ | Whether tier pricing is used |
| `tier_2_4kg_price` | double | ❌ | Price per kg for 2–4 kg |
| `tier_5_9kg_price` | double | ❌ | Price per kg for 5–9 kg |
| `tier_10kg_up_price` | double | ❌ | Price per kg for ≥10 kg |
| `available` | boolean | ✅ | Whether product is listed |
| `primary_image_id` | string | ❌ | FK → product_images.id |
| `created_at` | datetime | ✅ | Auto timestamp |

**Status:** ✅ Live

### 2. Product Images
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `product_id` | string | ✅ | FK → products.id |
| `file_id` | string | ✅ | File ID from `product-images` bucket |
| `is_primary` | boolean | ❌ | True = main display image |
| `is_cold_drink_bundle` | boolean | ❌ | Bundle promo image flag |
| `created_at` | datetime | ✅ | Auto timestamp |

**Status:** ✅ Live

### 3. Orders
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `customer_id` | string | ✅ | FK → customers.id |
| `address_id` | string | ✅ | FK → addresses.id |
| `order_items` | string | ✅ | **Deprecated** — use Order Items table |
| `total_price` | integer | ✅ | Final computed total |
| `total_weight_kg` | double | ❌ | Total weight in kg |
| `total_items_count` | integer | ❌ | Number of items |
| `subtotal_before_discount` | double | ❌ | Before any discounts |
| `total_discount_amount` | double | ❌ | Total discount applied |
| `payment_method` | string | ❌ | Always "cod" |
| `transaction_id` | string | ❌ | Optional transaction reference |
| `status` | enum | ✅ | `pending`, `accepted`, `out_for_delivery`, `delivered`, `returned` |
| `created_at` | datetime | ✅ | Auto timestamp |

**Status:** ✅ Live

### 4. Order Items
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `order_id` | string | ✅ | FK → orders.id |
| `product_id` | string | ✅ | FK → products.id |
| `product_name` | string | ✅ | Snapshot at order time |
| `product_description` | string | ❌ | Snapshot at order time |
| `quantity_kg` | double | ✅ | Total kg in this item |
| `bags_3kg` / `bags_5kg` / `bags_10kg` / `bags_25kg` | integer | ❌ | Bag breakdown |
| `price_per_kg_at_order` | double | ✅ | Price snapshot |
| `base_price_per_kg` | double | ✅ | Base price snapshot |
| `tier_applied` | string | ❌ | Which tier was used |
| `discount_percentage` / `discount_amount` | double | ❌ | Per-item discount |
| `subtotal_before_discount` | double | ✅ | Before discount |
| `total_after_discount` | double | ✅ | Final line total |
| `notes` | string | ❌ | Optional item notes |

**Status:** ✅ Live

### 5. Customers
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `user_id` | string | ✅ | Appwrite User ID |
| `full_name` | string | ✅ | Customer name |
| `phone` | string | ✅ | Contact number |
| `email` | string | ❌ | Optional |
| `created_at` | datetime | ✅ | Auto timestamp |

**Status:** ✅ Live

### 6. Addresses
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `customer_id` | string | ✅ | FK → customers.id |
| `order_id` | string | ✅ | FK → orders.id |
| `address_line` | string (1000) | ✅ | Full address |
| `city` | string | ❌ | Karachi area/locality |
| `latitude` | double | ✅ | GPS coordinate |
| `longitude` | double | ✅ | GPS coordinate |
| `maps_url` | string | ❌ | Auto-generated Google/Apple Maps link |
| `created_at` | datetime | ✅ | Auto timestamp |

**Status:** ✅ Live

### 7. Discount Management
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `type` | string | ✅ | `loyalty`, `rule`, `code` |
| `customer_id` / `customer_name` | string | ❌ | Linked customer |
| `card_status` | string | ❌ | Loyalty card status |
| `total_purchases` / `total_purchase_amount` | integer / double | ❌ | Customer activity |
| `eligible_for_extra_discount` | boolean | ❌ | Loyalty eligibility |
| `extra_discount_percentage` | double | ❌ | Loyalty discount rate |
| `rule_name` / `rule_active` | string / boolean | ❌ | Discount rule config |
| `discount_code` / `code_status` | string | ❌ | Per-order discount code |
| `discount_percentage` | double | ❌ | Discount value |
| `used_in_order_id` / `order_id` | string | ✅ | Order reference |
| `code_generated_at` / `code_used_at` | datetime | ❌ | Code lifecycle |

**Status:** ✅ Live

### 8. Push Subscriptions
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `endpoint` | string (500) | ✅ | Push endpoint URL (unique) |
| `p256dh` | string | ✅ | Encryption key |
| `auth` | string | ✅ | Auth secret |
| `user_id` | string | ❌ | Appwrite user if logged in |
| `status` | enum | ❌ | `active`, `inactive`, `pending` |
| `fail_count` | integer | ❌ | Consecutive failures |
| `user_agent` / `ip_address` | string | ❌ | Metadata |
| `last_used_at` | string | ❌ | Last activity timestamp |
| `tags` | string[] | ❌ | Categorization tags |
| `created_at` | string | ❌ | Auto timestamp |

**Indexes:** `idx_user_id`, `idx_status`, `idx_endpoint` (unique), `idx_created_at`

**Status:** ✅ Live

### 9. Push Notification Log
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `subscription_id` | string | ✅ | FK → push_subscriptions |
| `title` / `body` | string | ✅ | Notification content |
| `url` / `image` / `tag` | string | ❌ | Payload metadata |
| `status` | enum | ❌ | `sent`, `clicked`, `dismissed`, `failed`, `delivered` |
| `sent_at` / `clicked_at` / `dismissed_at` | string | ❌ | Event timestamps |
| `error_message` / `error_code` | string / integer | ❌ | Failure details |

**Indexes:** `idx_subscription_status`, `idx_status_sent`, `idx_tag`, `idx_created_at`

**Status:** ✅ Live

### 10. Push Templates
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `name` | string (100) | ✅ | Template name (unique) |
| `title` / `body` | string | ✅ | Template content |
| `icon` / `badge` / `url` / `image` | string | ❌ | Payload fields |
| `tag` | string | ❌ | Grouping tag |
| `actions` | string | ❌ | `JSON.stringify` action buttons |
| `require_interaction` | boolean | ❌ | Persistent notification flag |
| `ttl` | integer | ❌ | Time-to-live |
| `is_active` | boolean | ❌ | Whether template is usable |

**Indexes:** `idx_name` (unique), `idx_is_active`

**Status:** 🧪 Beta — Schema and `getTemplate`/`applyTemplate` functions exist, but **no admin management UI**. Planned for mobile notification templates.

### 11. Notification Campaigns
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `title` / `body` | string | ✅ | Campaign content |
| `image_url` / `icon_url` / `badge_url` / `target_url` | string | ❌ | Media |
| `tag` | string | ❌ | Campaign tag |
| `campaign_type` | string | ❌ | `push` (future: `email`, `sms`) |
| `status` | enum | ❌ | `draft`, `scheduled`, `sending`, `sent`, `failed`, `cancelled` |
| `scheduled_for` / `sent_at` | string | ❌ | Timeline |
| `sent_count` / `clicked_count` / `failed_count` | integer | ❌ | Metrics |

**Indexes:** `idx_status`, `idx_campaign_type`, `idx_scheduled_for`, `idx_created_at`

**Status:** 🧪 Beta — Table, REST API, and Server Actions exist, but **no admin UI**. Created for browser push but not production-ready there. **Reserved for mobile push** (FCM/APNs via Appwrite Messaging) where native notifications are reliable on iOS/Android.

### 12. Push User Preferences
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `user_id` | string | ✅ | Appwrite user ID (unique) |
| `enabled` | boolean | ❌ | Push enabled toggle |
| `quiet_hours_start` / `quiet_hours_end` | string | ❌ | Do-not-disturb window |
| `timezone` | string | ❌ | User timezone |
| `excluded_tags` | string | ❌ | Tags to suppress |
| `max_per_day` | integer | ❌ | Daily notification cap |

**Indexes:** `idx_user_id` (unique), `idx_enabled`

**Status:** 🚫 **Inactive by design** — `shouldSendToUser` is hardcoded to `true`. Table schema exists for future opt-in/opt-out features, but current business logic operates in "sales mode" (no user-level suppression).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 22 LTS)
- **pnpm** 11.4+ (`corepack enable pnpm`)
- **Appwrite** 1.9.0 self-hosted instance (or Appwrite Cloud)
- **VAPID keys** for browser push (optional, see [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md))

### 1. Install

```bash
pnpm install
```

### 2. Environment Variables

Copy `apps/web/env.example` to `apps/web/.env.local`:

```bash
cp apps/web/env.example apps/web/.env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | ✅ | Appwrite server URL (e.g. `https://yousufricemill.com/v1`) |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | ✅ | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | ✅ | TablesDB database ID |
| `NEXT_PUBLIC_APPWRITE_PRODUCTS_TABLE_ID` | ✅ | Products table ID |
| `NEXT_PUBLIC_APPWRITE_PRODUCT_IMAGES_TABLE_ID` | ✅ | Product Images table ID |
| `NEXT_PUBLIC_APPWRITE_ORDERS_TABLE_ID` | ✅ | Orders table ID |
| `NEXT_PUBLIC_APPWRITE_ORDER_ITEMS_TABLE_ID` | ✅ | Order Items table ID |
| `NEXT_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID` | ✅ | Customers table ID |
| `NEXT_PUBLIC_APPWRITE_ADDRESSES_TABLE_ID` | ✅ | Addresses table ID |
| `NEXT_PUBLIC_APPWRITE_DISCOUNT_MANAGEMENT_TABLE_ID` | ✅ | Discount Management table ID |
| `NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_TABLE_ID` | ❌ | Push subscriptions table ID |
| `NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID` | ✅ | Product images bucket ID |
| `NEXT_PUBLIC_BANNER_STORAGE_BUCKET_ID` | ✅ | Banner images bucket ID |
| `APPWRITE_API_KEY` | ✅ | Appwrite server API key |
| `NEXT_PUBLIC_PRIMARY_DOMAIN` | ✅ | Main domain (e.g. `https://yousufrice.com`) |
| `NEXT_PUBLIC_DOMAIN_3` | ✅ | Secondary domain (e.g. `https://ssricemills.com`) |
| `SMTP_PASSWORD` | ❌ | Gmail SMTP app password for transactional emails |
| `NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT` | ❌ | Toggle loyalty system (`true`/`false`) |
| `NEXT_PUBLIC_ENABLE_RAMADAN_OFFER` | ❌ | Toggle Ramadan offer |
| `NEXT_PUBLIC_ENABLE_COLD_DRINK_BUNDLE` | ❌ | Toggle cold drink bundle |
| `NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` | ❌ | Toggle push notifications (`true`/`false`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ❌ | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | ❌ | VAPID private key |
| `VAPID_EMAIL` | ❌ | VAPID contact email |
| `NEXT_PUBLIC_META_DATASET_ID` | ❌ | Meta Pixel dataset ID |
| `META_ACCESS_TOKEN` | ❌ | Meta Conversions API token |
| `META_TEST_EVENT_CODE` | ❌ | Server-only Meta Conversions API test event code |
| `OPENAI_API_KEY` | ❌ | OpenAI API key for AI chat |
| `NEXT_TELEMETRY_DISABLED` | ❌ | Disable Next.js telemetry |

### 3. Appwrite TablesDB Setup

The full schema is defined in `appwrite.config.json`. Apply it via the Appwrite CLI:

```bash
npx appwrite deploy table --all
```

The database requires **11 tables**: Products, Product Images, Orders, Order Items, Customers, Addresses, Discount Management, Push Subscriptions, Push Notification Log, Notification Campaigns, Push Templates, and Push User Preferences (see [schema above](#-tablesdb-schema)).

### 4. Storage Buckets

Create these buckets in Appwrite Console:

| Bucket | ID | Read | Write | Max Size | Types |
|--------|----|------|-------|----------|-------|
| `product-images` | As configured | Public | Admin only | 5 MB | jpg, jpeg, png, webp |
| `banner-images` | As configured | Public | Admin only | 5 MB | jpg, jpeg, png, webp |

### 5. Push Notifications Setup

For browser push, see the full guide in [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md).

For mobile push (planned), Appwrite Messaging will use FCM (Android) and APNs (iOS) providers configured in the Appwrite Console.

### 6. Admin Access

Grant admin via Appwrite Console → Auth → Users → select user → **Labels** tab → add `admin` label.

Optional read-only access: add `readonly` label.

---

## 🔐 Permissions & Access Control

| Role | Access |
|------|--------|
| **Admin** (`label: admin`) | Full CRUD on all tables + storage read/write |
| **Read-only admin** (`label: readonly`) | Read-only access to admin pages, write actions hidden |
| **Authenticated user** | Create/read own orders, addresses, customer profile |
| **Public** | Read-only access to available products |

---

## 🔄 Order Status Flow

```
Pending → Accepted → Out for Delivery → Delivered
                                    ↘ Returned
```

Admins update order status from the `/admin/orders` dashboard.

---

## 📱 PWA & Push Notifications

### Browser Push (✅ Live)

- **Service Worker** (`public/sw.js`): Handles push events, notification clicks, activation
- **Subscription**: `FloatingPushNotification` component → `usePushNotifications` hook → `/api/push/subscribe` → `push_subscriptions` table
- **Sending**: Admin panel (`/admin/notifications`) → `/api/push/send` → `web-push` library
- **Batch sending**: `/api/push/blast` endpoint with cursor pagination, 500 per batch
- **Logging**: `push_notification_log` table tracks sent, clicked, dismissed, failed
- **Tracking**: Click tracking via `/api/push/track` endpoint
- **Health/Metrics**: `/api/push/health`, `/api/push/stats`, `/api/push/status`

### Mobile Push (📋 Planned)

The current browser push infrastructure is **web-only** (Web Push API + VAPID). For the mobile app, the plan is:

1. Use `expo-notifications` to get native push tokens (FCM on Android, APNs on iOS)
2. Register tokens via Appwrite's `account.createPushTarget()`
3. Send via Appwrite Messaging (`messaging.createPush()`) through the admin panel
4. The `notification_campaigns` table (currently beta/unused for browser) will serve as the campaign management backend for mobile

---

## 📈 Analytics & Tracking

- **Admin dashboard**: GraphQL endpoint (`/api/admin/graphql`) aggregates revenue, top products, monthly trends, active customers
- **Meta tracking**: Pixel (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`) + server-side Conversions API via `/api/meta-events`
- **Staff performance**: Agent order attribution using user labels (`saima`, `kiran`), tracked separately from direct orders
- **Export**: CSV export from the orders admin page

---

## 🤖 AI Integration

- **OpenAI Agents SDK** integrated via `lib/agents/` with tools for Appwrite queries and loyalty discount management
- **Web**: Chat interface (`FloatingChatbox` + `/api/chat`) exists but is currently **broken** — needs debugging
- **Mobile**: Not yet implemented (planned for future update)
- API endpoint at `POST /api/chat` (auth required)

---

## 📚 References

| Document | Contents |
|----------|----------|
| [AGENTS.md](./AGENTS.md) | Detailed project guide for AI coding agents |
| [DESIGN.md](./DESIGN.md) | Complete design system (colors, typography, components, spacing, motion) |
| [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md) | Push notification architecture, setup, endpoints, and troubleshooting |
| [PWA_SETUP.md](./PWA_SETUP.md) | PWA implementation details and future roadmap |
| [appwrite.config.json](./appwrite.config.json) | TablesDB schema + Appwrite project configuration |

---

## 🏃 Scripts

```bash
# Development
pnpm dev              # Run both web + mobile
pnpm dev:web          # Run web only
pnpm dev:mobile       # Run mobile only

# Build
pnpm build            # Build all apps
pnpm build:web        # Build web only

# Quality
pnpm lint             # Run ESLint across all packages
pnpm typecheck        # Run TypeScript type checking

# Mobile
pnpm --filter=@yousuf-rice/mobile android   # Build for Android
pnpm --filter=@yousuf-rice/mobile ios       # Build for iOS
```

---

## 🔧 Current Development Focus

The project is actively being developed. Current priorities:

| Area | Status | Details |
|------|--------|---------|
| **Mobile app (Expo)** | 🔧 **Active** | Building out auth (login/signup), product listing, cart, checkout flow |
| **AI Chat (web)** | 🔧 **Needs fix** | `FloatingChatbox` + `/api/chat` integration is broken — debugging in progress |
| **AI Chat (mobile)** | 📋 **Pending** | Will be implemented after core mobile features are stable |
| **Mobile push notifications** | 📋 **Planned** | Using Appwrite Messaging (FCM/APNs) once app structure solidifies |

---

## 📝 License

Built for Yousuf Rice — a Karachi premium rice brand.
