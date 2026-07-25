# Yousuf Rice MCP Audit

## Overview

Audit of the existing Yousuf Rice codebase to identify current business logic, contradictions with old agent code, and a plan for building a production MCP server.

Date: 2026-07-25

---

## 1. Old Agent Tool Behaviour (apps/web/lib/agents/)

The following tools were built for the OpenAI Agents SDK but have not been actively used for 2-3 months:

### Tools in appwriteTools.ts

| Tool | Behaviour | Status |
|------|-----------|--------|
| `search_products` | Lists products with filters (search, stock, hotel/restaurant, limit). Uses `Query.search("name")` and in-memory filtering for hotel/restaurant. | Stale - may not reflect current product fields |
| `get_product_details` | Returns single product by ID with pricing tiers | Stale |
| `track_orders` | Tracks by order ID or phone. Fetches customer, address, order items. | Stale - uses CSV order_items field |
| `get_customer` | Finds customer by phone or email | Stale |
| `manage_customer` | Creates/updates customer record | Stale |
| `calculate_order_price` | Calculates total with tier pricing, **includes loyalty discount code** | **Loyalty discount is expired** |
| `create_order` | Full order creation with customer mgmt, price recalculation, order items, address, email, Meta tracking, **loyalty processing** | **Loyalty processing must be removed** |

### Tools in loyaltyTools.ts

| Tool | Behaviour | Status |
|------|-----------|--------|
| `check_loyalty_reward` | Checks for active loyalty discount codes | **Expired - do not include** |

### Agent Instructions (yousufRiceAgent.ts)

| Instruction | Value | Contradiction |
|-------------|-------|---------------|
| Delivery timeline | "next day after the order is placed" | Tool returns "2-3 business days" |
| Confirmation call | Instructions say "don't say you will receive confirmation call etc." | Tool says "You'll receive a confirmation call shortly" |
| Delivery area | Karachi only | Tool accepts any city |
| Loyalty discounts | Instructions mention discounts | Loyalty is expired |
| Payment | Cash on Delivery | Matches current |

---

## 2. Current Production Behaviour (from codebase audit)

### Appwrite Configuration

- **Database**: TablesDB via `node-appwrite` (server) or `appwrite` (browser)
- **Server client**: Uses `APPWRITE_API_KEY` for admin operations
- **Config location**: `apps/web/lib/appwrite.ts` + `packages/appwrite/`
- **Database ID**: `NEXT_PUBLIC_APPWRITE_DATABASE_ID`
- **Tables**: products, orders, order_items, customers, addresses, product_images, discount_management, push_subscriptions, push_log, notification_campaigns, notification_analytics

### Current Product Schema

```
products:
  $id (PK)
  name, description, base_price_per_kg, has_tier_pricing
  tier_2_4kg_price, tier_5_9kg_price, tier_10kg_up_price
  available, primary_image_id, $createdAt
```

### Current Pricing Logic

- **Flat price**: `base_price_per_kg * quantity`
- **Tier pricing** (when `has_tier_pricing = true`):
  - `quantity >= 10` → `tier_10kg_up_price`/kg
  - `quantity >= 5` → `tier_5_9kg_price`/kg
  - `quantity >= 2` → `tier_2_4kg_price`/kg
  - Otherwise → `base_price_per_kg`
- **Bag calculation**: Greedy fill from 25kg → 10kg → 5kg → 3kg bags
- **Delivery**: Free, described as "next day" in instructions but "2-3 business days" in tool output
- **Payment**: Cash on Delivery only

### Current Customer Schema

```
customers:
  $id (PK), user_id, full_name, phone, email, $createdAt
```

### Current Order Schema

```
orders:
  $id (PK), customer_id, address_id, order_items (CSV - legacy)
  total_items_count, total_weight_kg, subtotal_before_discount
  total_discount_amount, total_price, status, $createdAt
```

### Current Order Items Schema

```
order_items:
  $id (PK), order_id, product_id, product_name, product_description
  quantity_kg, bags_3kg, bags_5kg, bags_10kg, bags_25kg
  price_per_kg_at_order, base_price_per_kg, tier_applied
  discount_percentage, discount_amount, subtotal_before_discount
  total_after_discount, notes, $createdAt
```

### Current Address Schema

```
addresses:
  $id (PK), customer_id, order_id, address_line, city
  latitude, longitude, maps_url, $createdAt
```

### Current Loyalty/Discount System (EXPIRED)

- Controlled by `NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT` env var
- `discount_management` table stores loyalty records
- `LoyaltyService` handles code generation, validation, usage
- Auto-generates LOYALTY codes after qualifying orders (5000 PKR min)
- Hotels/restaurants excluded from loyalty
- **The loyalty program is disabled by default** - env var not set
- **Must not be exposed via MCP**

---

## 3. Current Service Layer (reusable)

| Service File | Class | Purpose | Reusable? |
|-------------|-------|---------|-----------|
| `order-service.ts` | `OrderService` | createOrder, getOrderWithDetails, updateOrderStatus, getCustomerOrders, deleteOrder | Yes, but needs loyalty removal |
| `loyalty-service.ts` | `LoyaltyService` | Loyalty eligibility, code gen, validation, usage | No - expired |
| `discount-service.ts` | `DiscountService` | Discount code validation, application | No - tied to loyalty |
| `admin-service.ts` | `AdminService` | Order listing, analytics, CSV export | Admin-only - not for MCP |

### Current Utility Layer (reusable)

| Location | Functions | Reusable? |
|----------|-----------|-----------|
| `@repo/utils` | `calculatePrice`, `getPricePerKg`, `calculateTierPricing`, `calculateItemTotal`, `calculateBagsFromQuantity`, `formatCurrency`, `generateMapsUrl`, `parseOrderItems`, `formatOrderItems`, `formatPhoneNumber`, `validatePakistaniPhoneNumber` | Yes - already shared |
| `@repo/types` | `Product`, `ProductImage`, `Customer`, `Address`, `OrderItem`, `Order`, `CartItem`, `OrderStatus` | Yes - already shared |

---

## 4. Conflicts and Stale Assumptions

| Issue | Old Agent | Current Reality | Action |
|-------|-----------|-----------------|--------|
| Delivery timeline | "next day" | "2-3 business days" | Use configurable policy |
| Confirmation call | Instructions say don't promise | Tool says "You'll receive a confirmation call" | Remove call promise; use current backend message |
| City restriction | Karachi only | No DB-level restriction | Enforce in domain service |
| Loyalty discounts | Included in price calc + order creation | Expired feature | Remove entirely |
| Agent model | gpt-5-nano, gpt-5.2 | Not relevant for MCP | N/A - MCP is model-agnostic |
| Guardrails | Input guardrails for relevance + special deals | Not applicable to MCP | N/A |
| Product classification | 9 retail + 1 hotel/restaurant | Determined by name contains "hotel"/"restaurant" | Keep same heuristic |
| Email confirmation | Sent after order | Still active | Keep as non-blocking side effect |
| Meta tracking | InitiateCheckout + Purchase events | Still active but privacy-sensitive | Keep as optional injected service |

---

## 5. Privacy and Security Risks

| Risk | Current State | Mitigation |
|------|--------------|------------|
| Phone-based customer lookup | Existing tools allow querying by phone | Require verified channel metadata |
| Order tracking by phone | Anyone with a phone number can see orders | Add verification requirement |
| Customer data exposure | Full customer profile returned | Minimize returned fields |
| Meta tracking consent | No consent check for agent-placed orders | Verify approach before including |
| Appwrite API key | Used server-side | Keep server-only; never expose via MCP |
| No auth on tools | Old tools had no auth | Add bearer token auth to MCP |

---

## 6. Proposed MCP Tool Inventory

| Tool | Description | Source |
|------|-------------|--------|
| `list_products` | List available products with pricing tiers | New domain service |
| `search_products` | Search products by name/description | New domain service |
| `get_product_details` | Detailed product info by ID | New domain service |
| `quote_order` | Create price quote (short-lived, server-side) | New domain service |
| `confirm_order` | Confirm quoted order (idempotent, 2-step) | New domain service |
| `track_order` | Track order by ID + verified phone | New domain service |
| `request_human_support` | Create escalation/support request | New domain service |

### Tools NOT to expose

| Tool | Reason |
|------|--------|
| `check_loyalty_reward` | Expired feature |
| `apply_discount_code` | Expired feature |
| `manage_customer` | Merged into confirm_order flow |
| `get_customer` | Privacy risk; merged into order flow |
| `create_database_row` | Security risk - raw DB access |
| `update_any_customer` | Security risk |
| `list_all_orders` | Privacy risk |
| `run_sql` / `run_terminal` | Security risk |

---

## 7. Implementation Plan

### Phase 1: Shared Domain Package (`packages/yousuf-rice-domain/`)

1. **Products domain** - list, search, getDetails
2. **Pricing domain** - calculatePrice with tiers
3. **Customers domain** - findOrCreate, lookup
4. **Addresses domain** - create, validate
5. **Orders domain** - createQuote, confirmQuote, getQuote, trackOrder
6. **Policies domain** - delivery rules, payment rules
7. **Appwrite client** - server-only Appwrite client wrapper
8. **Error types** - DomainError hierarchy

### Phase 2: MCP Server (`apps/mcp-server/`)

1. Streamable HTTP transport (primary)
2. stdio transport (development)
3. Bearer token authentication
4. Rate limiting
5. Zod input validation
6. Structured error responses
7. MCP tools implementation
8. MCP resources
9. MCP prompt template
10. Server instructions

### Phase 3: Hermes Integration (`deploy/hermes/yousuf-rice/`)

1. SOUL.md - permanent agent identity
2. MCP config example
3. README with setup instructions

### Phase 4: Testing

1. Unit tests for domain services
2. MCP protocol tests (initialization, tools/list, tools/call)
3. Integration smoke tests

### Phase 5: Deployment

1. Dockerfile for MCP server
2. Environment variable documentation
3. Build/test/lint commands
