# Yousuf Rice · Design System
**Version 1.0 · Karachi, Pakistan**

> A premium rice brand serving Karachi households. Every design decision should feel reliable, fresh, and direct — clear pricing, honest deals, fast checkout, delivery confidence.

---

## 1. Brand Identity

| Property | Value |
|---|---|
| Brand name | Yousuf Rice |
| Tagline | *Banaye Biryani ko Khaas!* |
| Website | yousufrice.com |
| Language | English primary · Urdu secondary |
| Tone | Plain, specific, confident |
| Personality | Premium but approachable. Not flashy. Karachi-rooted. |

**What we are:** A trusted Karachi household name for basmati and sella rice — fresh stock, per-kg clarity, cash on delivery.

**What we are not:** A generic e-commerce store. No purple gradients, no "exclusive best offer" filler copy, no decorative blobs competing with product photos.

---

## 2. Color System

Each family has 10 stops: `50` (lightest tint) → `900` (deepest shadow). The ★ marks the **brand hero shade** for that family — the one used in primary UI. Never use off-scale hex values; always pull from this table.

### 2.1 Brand Indigo · Hero / Primary

The backbone of every screen. Headers, selected states, primary buttons, admin anchors.

| Stop | Hex | Usage |
|---|---|---|
| 50 | `#F0F0FF` | Page tint, hover background |
| 100 | `#D9D8F7` | Subtle border, input background |
| 200 | `#B7B4EE` | Hover border, inactive chip |
| 300 | `#8E8ADE` | Placeholder icon, disabled text |
| 400 | `#6360CC` | Secondary action, muted badge |
| 500 | `#4441A8` | Link hover, pressed state |
| 600 | `#33308E` | Alternate header tint |
| **700** ★ | **`#27247B`** | **Primary brand color — headers, buttons, nav, price text** |
| 800 | `#1C1A5C` | Pressed button, dark heading |
| 900 | `#11103E` | Near-black body text on light bg |

### 2.2 Rice Gold · Accent / Highlight

Used small and intentional — deal counters, badge borders, tagline color on dark backgrounds. Never fill a whole screen with it.

| Stop | Hex | Usage |
|---|---|---|
| 50 | `#FFFFF0` | Barely-there tint background |
| 100 | `#FFFFC9` | Light badge background |
| 200 | `#FFFF99` | Subtle highlight stripe |
| 300 | `#FFFF5C` | Discount label fill |
| **400** ★ | **`#FFFF03`** | **Brand accent — tagline on dark, badge border, counter** |
| 500 | `#D4D400` | Pressed gold element |
| 600 | `#AAAA00` | Gold text on light background |
| 700 | `#808000` | Dark olive — border on gold fill |
| 800 | `#575700` | Deep olive text |
| 900 | `#2E2E00` | Near-black olive |

> **Rule:** Gold 400 (`#FFFF03`) is only readable as text color on Indigo 700 or darker. Never place it on white.

### 2.3 Fresh Green · CTA / Delivery / Success

Availability indicators, "Order" buttons, delivery confidence bars, completed states.

| Stop | Hex | Usage |
|---|---|---|
| 50 | `#ECFDF5` | Available-stock card background |
| 100 | `#D1FAE5` | Success toast background |
| 200 | `#A7F3D0` | Delivery confirmed strip |
| 300 | `#6EE7B7` | Progress indicator fill |
| 400 | `#34D399` | Secondary CTA hover |
| 500 | `#10B981` | Active delivery chip |
| **600** ★ | **`#047857`** | **Primary CTA — "Order", "Add to Cart", delivery badge** |
| 700 | `#065F46` | Pressed CTA, dark success |
| 800 | `#064E3B` | Success text on light green |
| 900 | `#022C22` | Near-black green |

### 2.4 Alert Amber · Labels / Stock / Bundles

Limited stock warnings, bundle labels, promotional deal badges, attention callouts.

| Stop | Hex | Usage |
|---|---|---|
| 50 | `#FFFBEB` | Deal card background tint |
| 100 | `#FEF3C7` | Bundle section background |
| 200 | `#FDE68A` | Light badge fill |
| 300 | `#FCD34D` | Warning pill fill |
| 400 | `#FBBF24` | Secondary badge |
| **500** ★ | **`#F59E0B`** | **Deal badge, limited-stock label, "% off" tag** |
| 600 | `#D97706` | Pressed amber, border on badge |
| 700 | `#B45309` | Amber text on light fill |
| 800 | `#92400E` | Dark warning text |
| 900 | `#5C2709` | Near-black amber |

### 2.5 Neutral · Surface / Border / Text

Tinted with the Indigo undertone so the whole palette feels like one family — not generic gray.

| Stop | Hex | Usage |
|---|---|---|
| 0 | `#FFFFFF` | Pure white — page canvas, card surface |
| 50 | `#F8FAFC` | Market mist — app background, off-white sections |
| 100 | `#EEF1F7` | Subtle divider fill |
| 200 | `#D8DEEE` | Default border — card, input |
| 300 | `#B0BCDA` | Hover border |
| 400 | `#8896C0` | Muted text, placeholder, icon |
| 500 | `#606FA0` | Secondary label text |
| 600 | `#404C7A` | Body text, description copy |
| 700 | `#283058` | Strong body text |
| 900 | `#181E38` | Near-black heading alternative |

---

## 3. Role Assignment

Every color must have a job. Do not decorate — assign.

### Backgrounds
| Role | Color | Stop |
|---|---|---|
| Page canvas | `#FFFFFF` | Neutral 0 |
| App / section background | `#F8FAFC` | Neutral 50 |
| Card surface | `#FFFFFF` | Neutral 0 |
| Indigo tinted section | `#F0F0FF` | Indigo 50 |
| Deal section background | `#FFFBEB` | Amber 50 |
| Available-item background | `#ECFDF5` | Green 50 |

### Borders
| Role | Color | Stop |
|---|---|---|
| Default card border | `#D8DEEE` | Neutral 200 |
| Input default | `#D9D8F7` | Indigo 100 |
| Input hover / focus | `#B7B4EE` | Indigo 200 |
| Selected chip border | `#27247B` | Indigo 700 |
| Separator line | `#EEF1F7` | Neutral 100 |

### Typography
| Role | Color | Stop |
|---|---|---|
| Heading / product name / price | `#27247B` | Indigo 700 |
| Body text / description | `#404C7A` | Neutral 600 |
| Muted / secondary label | `#8896C0` | Neutral 400 |
| Placeholder | `#B0BCDA` | Neutral 300 |
| Tagline on dark bg | `#FFFF03` | Gold 400 |
| Error text | `#92400E` | Amber 800 |

### Interactive Elements
| Role | Color | Notes |
|---|---|---|
| Primary button bg | Indigo 700 `#27247B` | White text |
| Primary button pressed | Indigo 800 `#1C1A5C` | |
| CTA button bg | Green 600 `#047857` | White text |
| CTA pressed | Green 700 `#065F46` | |
| Secondary button | Transparent + Indigo 700 border | Indigo 700 text |
| Deal badge | Amber 500 `#F59E0B` | White text |
| Discount tag | Amber 500 `#F59E0B` | White text |
| Accent border / counter | Gold 400 `#FFFF03` | On dark surfaces only |
| Selected nav item | Indigo 700 `#27247B` | |
| Available pill | Green 600 `#047857` | White text |
| Out of stock pill | Neutral 400 `#8896C0` | White text |

---

## 4. Typography

### Font Stack

| Role | Font | Weight | Use case |
|---|---|---|---|
| Display / Brand | Playfair Display | 600, 700 | Brand name, section hero titles, product names |
| UI / Body | DM Sans | 300, 400, 500, 600 | All UI text, labels, prices, body copy |
| Mono / Code | DM Mono | 400, 500 | Hex codes, order IDs, tracking numbers |

**Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
```

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `display-xl` | 32px | 700 | 1.15 | Hero brand headline |
| `display-lg` | 26px | 700 | 1.2 | Screen title, product hero |
| `display-md` | 22px | 600 | 1.25 | Section header, banner headline |
| `title-lg` | 18px | 600 | 1.3 | Card title, modal heading |
| `title-md` | 16px | 600 | 1.35 | Sub-section heading |
| `title-sm` | 14px | 600 | 1.4 | Label heading, chip text |
| `body-lg` | 15px | 400 | 1.6 | Primary body copy |
| `body-md` | 13px | 400 | 1.55 | Secondary description |
| `body-sm` | 12px | 400 | 1.5 | Metadata, timestamps |
| `price` | 16–20px | 700 | 1.0 | Per-kg price — always Indigo 700 |
| `badge` | 10px | 700 | 1.0 | Deal %, "New", "COD" tags |
| `caption` | 10px | 400 | 1.4 | Supporting fine print |

### Rules

- **Sentence case** everywhere. Never ALL CAPS except badge labels (max 3 words).
- **Price always bold.** Per-kg price is the most important number on any product card.
- **No italic in UI** unless it is Urdu script or a pullquote.
- Urdu copy uses `font-family: 'Noto Nastaliq Urdu', serif` with `direction: rtl`.

---

## 5. Spacing

Built on an **8px base grid**.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon gap, tight inline items |
| `space-2` | 8px | Between label and value |
| `space-3` | 12px | Card internal gap |
| `space-4` | 16px | Page horizontal padding |
| `space-5` | 20px | Section internal padding |
| `space-6` | 24px | Between sections |
| `space-8` | 32px | Major section gap |
| `space-10` | 40px | Hero vertical padding |
| `space-12` | 48px | Screen top padding |

**Mobile page padding:** 16px left/right, always.
**Card internal padding:** 12px all sides.
**Bottom nav height:** 56px + safe area inset.
**Status bar height:** 44px.

---

## 6. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-xs` | 4px | Badge, pill tag |
| `radius-sm` | 8px | Input field, chip |
| `radius-md` | 12px | Button |
| `radius-lg` | 16px | Card |
| `radius-xl` | 20px | Bottom sheet, modal |
| `radius-full` | 9999px | Avatar, circular icon button |
| `radius-phone` | 40px | Phone frame |

---

## 7. Components

### 7.1 Product Card

The most important component. Must show: product image, name, weight/unit, per-kg price, one add action. Nothing else.

```
┌─────────────────────┐
│  [IMG]  [badge]  ♡  │   ← 100px image area
│  🌾                 │   ← product photo centered
├─────────────────────┤
│ Product Name        │   ← DM Sans 600 13px · Indigo 700
│ Per KG              │   ← DM Sans 400 10px · Neutral 400
│ Rs. 280       [ + ] │   ← price bold · add btn Green 600
└─────────────────────┘
```

**Rules:**
- Image background: Neutral 50 or category tint (no white bleed)
- Deal badge: top-left, Amber 500, white text, `radius-xs`
- Favourite icon: top-right, Neutral 300 default, Amber 500 active
- Add button: 28×28px circle, Green 600 bg, white `+`, no label
- Price: Indigo 700, DM Sans 700, 15px minimum
- Card border: Neutral 200, 1px, `radius-lg`
- Hover: `transform: translateY(-2px)` — subtle lift only

### 7.2 Buttons

| Type | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | Indigo 700 | White | None | Main CTA — "Order", "Sign in" |
| CTA | Green 600 | White | None | Add to Cart, Confirm Delivery |
| Secondary | Transparent | Indigo 700 | 1.5px Indigo 700 | Alternative actions |
| Ghost | Transparent | Neutral 600 | 1px Neutral 200 | Tertiary actions |
| Danger | Transparent | Amber 800 | 1px Amber 500 | Cancel, remove |

**Sizing:**
- Full-width: `width: 100%; padding: 14px; border-radius: 24px`
- Inline: `padding: 8px 20px; border-radius: 20px`
- Icon button: `40×40px; border-radius: 50%`

**Copy rules — always a direct verb:**
✓ Order · Add · Enable · Refresh · Export · Confirm · Cancel  
✗ Click here · Submit · Go · Proceed · Continue shopping

### 7.3 Category Chips

Used in horizontal scroll rows.

```
Default:  [icon] Label    → bg: white, border: Neutral 200, text: Neutral 600
Active:   [icon] Label    → bg: Indigo 700, border: none, text: white
Category: [icon] Label    → bg: Green 600, border: none, text: white (subcategory active)
```

- Height: 34px
- Padding: `8px 14px`
- Radius: `radius-sm` (8px)
- Icon: 16px, matches text color
- Gap between chips: 8px
- Never wrap — horizontal scroll only

### 7.4 Status Pills

Compact. Color-coded. Never cause parent overflow.

| Status | Background | Text |
|---|---|---|
| Available | Green 50 | Green 700 |
| Out of Stock | Neutral 100 | Neutral 500 |
| Limited Stock | Amber 100 | Amber 800 |
| New Arrival | Indigo 50 | Indigo 700 |
| COD | Green 100 | Green 800 |

- Font: DM Sans 500, 10px
- Padding: `3px 8px`
- Radius: `radius-xs` (4px)

### 7.5 Banner / Promotion Strip

```
┌──────────────────────────────────┐
│  [badge: "Limited!"]             │  ← Gold 400 on Indigo 700, top-right
│                                  │
│  20% Off          🌾             │
│  First Order                     │
│  [Order Now btn]                 │
└──────────────────────────────────┘
```

- Background: Indigo 700
- Headline: Playfair Display 700 · Gold 400
- Sub-copy: DM Sans 400 · Indigo 200
- CTA: Gold 400 bg · Indigo 900 text
- Radius: `radius-lg` (16px)
- No gradient overlays

### 7.6 Deal Badge

- Background: Amber 500
- Text: White, DM Sans 700, 10px
- Padding: `3px 8px`
- Radius: `radius-xs`
- Position: absolute top-left of product image
- Max label: 6 characters (`"20% off"`, `"New"`, `"Bundle"`)

### 7.7 Bottom Navigation

- Height: 56px + device safe area
- Background: White
- Border top: 1px Neutral 200
- 5 items: Locate · Home · Categories · Orders · Profile
- Active: icon + label Indigo 700, 4px gold dot indicator below
- Inactive: icon + label Neutral 300

### 7.8 Search Bar

```
[ 🔍  Search for Basmati and more... ]  [ filter icon btn ]
```

- Input: Neutral 50 bg, no border, `radius-sm`
- Placeholder: Neutral 400 · keyword highlighted in Green 600
- Filter button: Indigo 700 bg, Gold 400 icon, `radius-sm`
- Height: 38px

---

## 8. Layout

### Mobile (App — iOS & Android)

- Screen width: 390px reference (iPhone 15 Pro)
- Page padding: 16px left/right
- Safe area: respect `env(safe-area-inset-*)` for notch and home indicator
- Content max-width: 100% — no horizontal scroll on body
- Grid: 2-column product grid, `gap: 12px`
- Sections: stacked vertically, `gap: 24px` between major sections
- Category rows: horizontal scroll, `scrollbar-width: none`

### Screen Hierarchy

```
Status Bar (44px)
└── Screen Header (varies: 56–80px)
    └── Content Area (scrollable)
        ├── Promotion Banner
        ├── Category Chips Row
        ├── Section Header (title + "View All")
        ├── Product Grid (2-col)
        └── New Arrivals
Bottom Navigation (56px + safe area)
```

### Web (yousufrice.com)

- Max content width: 1200px, centered
- Page padding: 24px mobile · 48px tablet · 80px desktop
- Product grid: 2 col mobile · 3 col tablet · 4 col desktop
- Hero section: full-width, Indigo 700 bg, product photo right-aligned
- No decorative blobs, no hero gradient overlays

---

## 9. Imagery

- **Product photos:** real bag shots on neutral backgrounds (Neutral 50 or white)
- **Lifestyle:** Pakistani kitchen aesthetics — biryani, degchi, copper pots, steam
- **No generic stock:** no western kitchen imagery, no models unrelated to Karachi context
- **Aspect ratios:** product card 1:1 · hero 16:9 · category icon 1:1 circle
- **Overlay rule:** if text sits on a photo, add an Indigo 900 overlay at 40% opacity — never pure black

---

## 10. Motion

Restrained. Every animation serves a function — not decoration.

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Button press | `scale(0.97)` | 100ms | ease-in-out |
| Card hover | `translateY(-2px)` | 150ms | ease-out |
| Screen transition | slide + fade | 250ms | ease-in-out |
| Toast / pill appear | `opacity 0→1 + translateY(4px→0)` | 200ms | ease-out |
| Image load | `opacity 0→1` | 300ms | ease |
| Skeleton loader | shimmer pulse | 1.2s | ease-in-out loop |

**No:** spin animations on operational screens, bounce loops, parallax on product pages.

---

## 11. Voice & Copy

### Principles

1. **Specific over vague.** "Basmati 1121 · Rs. 320/kg" beats "Premium quality at great prices."
2. **Direct verbs.** "Order" not "Proceed to checkout." "Enable" not "Allow access."
3. **Honest deals.** Only say "Limited" if stock is actually limited.
4. **Karachi-rooted.** "Karachi home delivery" · "Cash on Delivery" · "Same-day dispatch."
5. **No "exclusive."** Unless the offer is genuinely restricted.

### Sample Copy

| Context | Good | Bad |
|---|---|---|
| Hero tagline | *Banaye Biryani ko Khaas!* | *Premium Rice for Premium Families* |
| Delivery confidence | Cash on Delivery · Karachi | Fast & Reliable Shipping |
| Deal label | 20% off first order | Exclusive Best Offer |
| Stock status | Only 4 kg left | Selling fast! |
| CTA | Order Now | Shop Now |
| Bundle | Cold Drink Bundle · 10kg + Drink | Ultimate Value Pack |
| Empty state | No items in this category yet | Nothing to show here |

---

## 12. Anti-Patterns

These are banned in Yousuf Rice UI. No exceptions.

| Anti-Pattern | Why |
|---|---|
| Horizontal body scroll on mobile | Breaks usability, hides content |
| Purple or blue gradient hero backgrounds | Generic, un-branded |
| Decorative blobs or abstract shapes | Compete with product photos |
| Marketing copy before product information | Delays the order, frustrates users |
| Nested card layouts (card inside card inside card) | Visual noise, padding confusion |
| `nowrap` headings that overflow | Breaks layouts on small devices |
| Generic "exclusive" or "best offer" copy | Erodes trust |
| Long animation loops on operational screens | Distracting during ordering |
| Placing Gold 400 (`#FFFF03`) text on white | Fails contrast — unreadable |
| More than 2 actions on one product card | Decision fatigue |
| Status pills that overflow their parent | Causes layout shift |
| Off-scale hex values outside the defined palette | Breaks system cohesion |

---

## 13. Accessibility

- **Contrast minimum:** AA (4.5:1 for body text, 3:1 for large text / UI components)
- **Touch target minimum:** 44×44px for all interactive elements
- **Focus ring:** 2px solid Indigo 400, 2px offset — never hidden
- **Alt text:** all product images must have descriptive alt (`"Yousuf Rice Ultimate Sella 5kg bag"`)
- **Don't rely on color alone** to communicate status — always pair with a label or icon
- Gold 400 text: only on Indigo 700 or darker backgrounds (contrast passes at 7.2:1 on Indigo 700)

---

## 14. Tokens (CSS Variables)

```css
:root {
  /* Brand Indigo */
  --indigo-50:  #F0F0FF;
  --indigo-100: #D9D8F7;
  --indigo-200: #B7B4EE;
  --indigo-300: #8E8ADE;
  --indigo-400: #6360CC;
  --indigo-500: #4441A8;
  --indigo-600: #33308E;
  --indigo-700: #27247B; /* ★ primary */
  --indigo-800: #1C1A5C;
  --indigo-900: #11103E;

  /* Rice Gold */
  --gold-50:  #FFFFF0;
  --gold-100: #FFFFC9;
  --gold-200: #FFFF99;
  --gold-300: #FFFF5C;
  --gold-400: #FFFF03; /* ★ accent */
  --gold-500: #D4D400;
  --gold-600: #AAAA00;
  --gold-700: #808000;
  --gold-800: #575700;
  --gold-900: #2E2E00;

  /* Fresh Green */
  --green-50:  #ECFDF5;
  --green-100: #D1FAE5;
  --green-200: #A7F3D0;
  --green-300: #6EE7B7;
  --green-400: #34D399;
  --green-500: #10B981;
  --green-600: #047857; /* ★ CTA */
  --green-700: #065F46;
  --green-800: #064E3B;
  --green-900: #022C22;

  /* Alert Amber */
  --amber-50:  #FFFBEB;
  --amber-100: #FEF3C7;
  --amber-200: #FDE68A;
  --amber-300: #FCD34D;
  --amber-400: #FBBF24;
  --amber-500: #F59E0B; /* ★ deal badge */
  --amber-600: #D97706;
  --amber-700: #B45309;
  --amber-800: #92400E;
  --amber-900: #5C2709;

  /* Neutral */
  --neutral-0:   #FFFFFF;
  --neutral-50:  #F8FAFC;
  --neutral-100: #EEF1F7;
  --neutral-200: #D8DEEE;
  --neutral-300: #B0BCDA;
  --neutral-400: #8896C0;
  --neutral-500: #606FA0;
  --neutral-600: #404C7A;
  --neutral-700: #283058;
  --neutral-900: #181E38;

  /* Semantic aliases */
  --color-primary:    var(--indigo-700);
  --color-accent:     var(--gold-400);
  --color-cta:        var(--green-600);
  --color-warning:    var(--amber-500);
  --color-bg:         var(--neutral-0);
  --color-surface:    var(--neutral-50);
  --color-border:     var(--neutral-200);
  --color-text:       var(--indigo-700);
  --color-text-body:  var(--neutral-600);
  --color-text-muted: var(--neutral-400);

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Radius */
  --radius-xs:   4px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-full: 9999px;

  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-ui:      'DM Sans', system-ui, sans-serif;
  --font-mono:    'DM Mono', 'Courier New', monospace;
}
```

---

*Maintained by Yousuf Rice digital team. Update version when any token changes.*