# Yousuf Rice · Design System
**Version 4.0 · Karachi, Pakistan**

> A premium rice brand serving Karachi households. Apple-inspired minimalism: white is the canvas, color is a quiet accent. Light, airy, generous space — never a heavy dark-blue or candy-bright fill.

---

## 1. Brand Identity

| Property | Value |
|---|---|
| Brand name | Yousuf Rice |
| Tagline | *Banaye Biryani ko Khaas!* |
| Website | yousufrice.com |
| Language | English primary · Urdu secondary |
| Tone | Plain, specific, confident |
| Personality | Premium, light, airy. Karachi-rooted, not flashy. |

**Core brand colors:** White `#FFFFFF` · Indigo `#27247B` · Champagne Gold `#D4AD54`

**What we are:** White-forward and calm. Indigo carries the brand identity (logo, headings, price, primary CTA). Champagne Gold is a soft, premium highlight — never a loud fill. Coral marks deals/alerts only.

**What we are not:** No dark-blue page fills. No neon/candy yellow. No icy cyan tints. No green anywhere — it isn't a brand color. No gradients, no decorative blobs. Color is an accent on white, never the canvas.

---

## 2. Color System

10 stops per family, `50` (lightest) → `900` (deepest). ★ = hero shade(s).

**What changed from v3:** The old "Ocean Blue" ramp leaned on an icy cyan (`#A8DADC`) for its light tints, and the accent yellow (`#FDF654`) was a saturated neon — together they read like a sno-cone. Both are replaced below: light tints now run lavender→indigo (same family as the brand navy, just softer), and the yellow becomes a muted **Champagne Gold** — same warm hue family, far more luxury. The **Mint/green** family is removed entirely; Indigo now covers all primary actions and CTAs (one accent family, Apple-style).

### 2.1 Indigo · Brand & Primary Action

| Stop | Hex | Usage |
|---|---|---|
| 50 | `#F7F7FC` | Tinted section bg, hover fill |
| 100 | `#EFEFF9` | Subtle card tint, "Available" pill bg |
| 200 | `#DCDDF2` | Selected-state border |
| **300** ★ | **`#C1C3E8`** | **Light tint — info sections, soft fills** |
| 400 | `#9EA1D8` | Light icon, decorative accent |
| 500 | `#7A7EC4` | Hover state |
| **600** ★ | **`#5A5DA8`** | **Primary action — buttons, links, active nav** |
| 700 | `#423F8C` | Pressed primary, "Available" pill text |
| **800** ★ | **`#27247B`** | **Brand anchor — logo, headings, price; CTA bg ("Order", "Add to Cart")** |
| 900 | `#1A1854` | Pressed CTA, deepest navy |

A single white "Buy"-style CTA in Indigo 800 reads premium against the white canvas — same logic as Apple's high-contrast buttons, just in brand navy.

### 2.2 Champagne Gold · Accent

A muted, warm gold — strictly a **fill** color, paired with Indigo 800 or Neutral 900 text. Never text-on-white or white-on-gold.

| Stop | Hex | Usage |
|---|---|---|
| 50 | `#FBF8F0` | Barely-there tint bg |
| 100 | `#F6EDD7` | Highlight strip bg, "New Arrival" pill bg |
| 200 | `#EDDBAE` | Subtle highlight fill |
| 300 | `#E1C480` | Light badge fill |
| **400** ★ | **`#D4AD54`** | **Accent — badge fill, tagline highlight (pair with Indigo text)** |
| 500 | `#B8923D` | Pressed gold element |
| 600 | `#96762E` | Gold text on white (passes AA) |
| 700 | `#735A23` | "New Arrival" pill text |
| 800 | `#54421A` | Deep gold/bronze |
| 900 | `#362B11` | Near-black bronze |

### 2.3 Coral · Deals / Alerts / Limited Stock

| Stop | Hex | Usage |
|---|---|---|
| 50 | `#FEEEEF` | Deal card bg tint |
| 100 | `#FCD4D7` | "Limited Stock" pill bg |
| 200 | `#F8A9AF` | Light badge fill |
| 300 | `#F37D85` | Warning pill fill |
| 400 | `#EE525D` | Secondary badge |
| **500** ★ | **`#E63946`** | **Deal badge, sale tag, limited-stock label** |
| 600 | `#C32834` | Pressed coral, small text on white |
| 700 | `#9C1F29` | Dark coral text, "Limited Stock" pill text |
| 800 | `#74171F` | Deep coral text |
| 900 | `#4D0E14` | Near-black coral |

### 2.4 Neutral · Surface / Border / Text — *the workhorse*

White-first, cool gray with a faint indigo undertone — no warm/green cast.

| Stop | Hex | Usage |
|---|---|---|
| **0** ★ | **`#FFFFFF`** | **Page canvas, card surface — the default everything** |
| 50 | `#FAFAFC` | App background |
| 100 | `#F3F3F7` | Alt section bg, "COD" pill bg |
| 200 | `#E6E6ED` | Default border — card, input |
| 300 | `#CFD0DA` | Hover border |
| 400 | `#A3A5B5` | Muted text, placeholder, icon, "Out of Stock" pill bg |
| 500 | `#7B7D8F` | Secondary label text, "Out of Stock" pill text |
| 600 | `#565869` | Body text |
| 700 | `#3C3E4D` | Strong body text, "COD" pill text |
| 900 | `#1D1E28` | Heading (use instead of pure black) |

---

## 3. Role Assignment

| Role | Color | Stop |
|---|---|---|
| Page canvas | `#FFFFFF` | Neutral 0 |
| App background | `#FAFAFC` | Neutral 50 |
| Alt section bg | `#F3F3F7` | Neutral 100 |
| Tinted section | `#F7F7FC` / `#C1C3E8` | Indigo 50 / 300 |
| Deal section bg | `#FEEEEF` | Coral 50 |
| Default border | `#E6E6ED` | Neutral 200 |
| Input focus border | `#5A5DA8` | Indigo 600 |
| Heading / price / logo | `#27247B` | Indigo 800 |
| Links, active nav, primary buttons | `#5A5DA8` | Indigo 600 |
| Body text | `#565869` | Neutral 600 |
| Muted / secondary | `#A3A5B5` | Neutral 400 |
| Accent highlight (fill only) | `#D4AD54` | Gold 400 |
| Primary button bg | Indigo 600 (white text) | |
| Primary pressed | Indigo 700 | |
| CTA button bg ("Order", "Add to Cart") | Indigo 800 (white text) | |
| CTA pressed | Indigo 900 | |
| Secondary button | Transparent + Indigo 600 border/text | |
| Deal badge / sale tag | Coral 500 (white text) | |
| Out of stock pill | Neutral 400 bg (Neutral 500 text) | |

---

## 4. Typography

Apple-style sans via `next/font/google` — `Inter` as the base, `-apple-system` first so iOS/macOS render native SF Pro automatically.

**`app/layout.tsx`:**
```tsx
import { Inter, Geist_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

**`globals.css`:**
```css
:root {
  --font-display: -apple-system, 'SF Pro Display', var(--font-ui), system-ui, sans-serif;
  --font-ui-stack: -apple-system, 'SF Pro Text', var(--font-ui), system-ui, sans-serif;
}
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
| `price` | 16–20px | 700 | 1.0 | Per-kg price — always Indigo 800 |
| `badge` | 10px | 700 | 1.0 | Deal %, "New", "COD" tags |
| `caption` | 10px | 400 | 1.4 | Fine print |

**Rules:** Sentence case everywhere (badges max 3 words may be caps). Price always bold. No italic except Urdu script or pullquotes. Urdu copy: `font-family: 'Noto Nastaliq Urdu', serif; direction: rtl`.

---

## 5. Spacing & Radius

**8px base grid**, Apple-style soft, slightly larger corners.

| Spacing | Value | | Radius | Value |
|---|---|---|---|---|
| `space-1` | 4px | | `radius-xs` | 6px |
| `space-2` | 8px | | `radius-sm` | 10px |
| `space-3` | 12px | | `radius-md` | 14px |
| `space-4` | 16px | | `radius-lg` | 20px |
| `space-5` | 20px | | `radius-xl` | 28px |
| `space-6` | 24px | | `radius-full` | 9999px |
| `space-8` | 32px | | `radius-phone` | 40px |
| `space-10` | 40px | | | |
| `space-12` | 48px | | | |

Mobile page padding: 16px. Card padding: 12px. Bottom nav: 56px + safe area. Status bar: 44px.

---

## 6. Components

### 6.1 Product Card
Shows: image, name, weight/unit, per-kg price, one add action.

```
┌─────────────────────┐
│  [IMG]  [badge]  ♡  │  ← 100px image, Neutral 50 bg
│  🌾                 │
├─────────────────────┤
│ Product Name        │  ← Inter 600 13px · Neutral 900
│ Per KG              │  ← Inter 400 10px · Neutral 400
│ Rs. 280       [ + ] │  ← price bold, Indigo 800 · add btn Indigo 800
└─────────────────────┘
```
- Border: Neutral 200, 1px, `radius-lg`. Hover: lift `translateY(-2px)`.
- Deal badge: top-left, Coral 500, white text, `radius-xs`.
- Favourite icon: Neutral 300 default → Coral 500 active.
- Add button: 28×28 circle, Indigo 800 bg, white `+`.

### 6.2 Buttons

| Type | Background | Text | Border |
|---|---|---|---|
| Primary | Indigo 600 | White | None |
| CTA ("Order", "Add to Cart") | Indigo 800 | White | None |
| Secondary | White / transparent | Indigo 600 | 1.5px Indigo 600 |
| Ghost | Transparent | Neutral 600 | 1px Neutral 200 |
| Danger | Transparent | Coral 700 | 1px Coral 500 |

Sizing: full-width `padding: 14px; radius: 24px` · inline `padding: 8px 20px; radius: 20px` · icon `40×40px; radius: 50%`.
Copy: direct verbs only — *Order, Add, Enable, Confirm* ✓ — never *Click here, Proceed* ✗.

### 6.3 Category Chips
Default: white bg, Neutral 200 border, Neutral 600 text. Active: Indigo 600 bg, white text. Subcategory active: Gold 400 bg, Indigo 800 text.
Height 34px · padding `8px 14px` · `radius-sm` · icon 16px · gap 8px · horizontal scroll only.

### 6.4 Status Pills

| Status | Background | Text |
|---|---|---|
| Available | Indigo 100 | Indigo 700 |
| Out of Stock | Neutral 400 | Neutral 500 |
| Limited Stock | Coral 100 | Coral 700 |
| New Arrival | Gold 100 | Gold 700 |
| COD | Neutral 100 | Neutral 700 |

Inter 500, 10px · padding `3px 8px` · `radius-xs`.

### 6.5 Promotion Banner
Light, not heavy — bg White or Neutral 100, never a full dark fill.

```
┌──────────────────────────────────┐
│  [badge: "Limited"]  Gold 400     │  ← navy text on gold fill
│  20% Off          🌾              │
│  First Order      (Indigo 800)    │
│  [Order Now] — Indigo 800 bg/white│
└──────────────────────────────────┘
```
Background: White or Neutral 100 · Headline: Indigo 800 · Sub-copy: Neutral 600 · `radius-lg`. No gradients.

### 6.6 Deal Badge
Coral 500 bg, white Inter 700 10px text, `padding: 3px 8px`, `radius-xs`, top-left of image. Max label: 6 chars (`"20% off"`, `"New"`, `"Bundle"`).

### 6.7 Bottom Navigation
White bg, 1px Neutral 200 top border, 56px + safe area. 5 items: Locate · Home · Categories · Orders · Profile. Active: Indigo 600 icon/label + 4px Coral 500 dot. Inactive: Neutral 300.

### 6.8 Search Bar
`[ 🔍  Search for Basmati and more... ]  [ filter icon ]`
- Input: Neutral 50 bg, no border, `radius-sm`, 38px height.
- Placeholder: Neutral 400 · keyword highlight in Indigo 600.
- Filter button: Indigo 600 bg, white icon, `radius-sm`.

---

## 7. Layout

**Mobile (iOS & Android):** 390px reference width · 16px page padding · respect safe-area insets · 2-col product grid, `gap: 12px` · sections stacked `gap: 24px` · category rows horizontal scroll, no scrollbar.

```
Status Bar (44px)
└── Screen Header (56–80px)
    └── Content Area (scrollable)
        ├── Promotion Banner
        ├── Category Chips Row
        ├── Section Header (title + "View All")
        ├── Product Grid (2-col)
        └── New Arrivals
Bottom Navigation (56px + safe area)
```

**Web (yousufrice.com):** max-width 1200px centered · padding 24px mobile / 48px tablet / 80px desktop · product grid 2/3/4 cols · hero section is **White or Neutral 100 background**, product photo right-aligned, Indigo 800 headline text. No decorative blobs, no gradient overlays.

---

## 8. Voice & Copy

1. Specific over vague — "Basmati 1121 · Rs. 320/kg" beats "Premium quality."
2. Direct verbs — "Order" not "Proceed to checkout."
3. Honest deals — only say "Limited" if actually limited.
4. Karachi-rooted — "Karachi home delivery," "Cash on Delivery."
5. No "exclusive" unless genuinely restricted.

| Context | Good | Bad |
|---|---|---|
| Hero tagline | *Banaye Biryani ko Khaas!* | *Premium Rice for Premium Families* |
| Delivery | Cash on Delivery · Karachi | Fast & Reliable Shipping |
| Deal label | 20% off first order | Exclusive Best Offer |
| Stock status | Only 4 kg left | Selling fast! |
| CTA | Order Now | Shop Now |
| Bundle | Cold Drink Bundle · 10kg + Drink | Ultimate Value Pack |
| Empty state | No items in this category yet | Nothing to show here |

---

## 9. Anti-Patterns

| Anti-Pattern | Why |
|---|---|
| Dark navy / saturated full-screen backgrounds | Heavy, dated — keep white as canvas |
| Neon yellow or icy cyan tints | Reads as candy/sno-cone — use Gold 400 and Indigo 50–300 instead |
| Any green/mint anywhere | Not a brand color — removed from the system entirely |
| Champagne Gold as body text or on white | Fails contrast — fill only, pair with Indigo 800 text |
| White text on Gold | Fails contrast |
| Purple/blue gradient heroes | Generic, un-branded |
| Decorative blobs or abstract shapes | Compete with product photos |
| Marketing copy before product info | Delays the order |
| Nested cards (card-in-card-in-card) | Visual noise |
| `nowrap` headings that overflow | Breaks small screens |
| Generic "exclusive"/"best offer" copy | Erodes trust |
| Long animation loops on operational screens | Distracting |
| More than 2 actions per product card | Decision fatigue |
| Off-scale hex values outside this palette | Breaks system cohesion |

---

## 10. Motion

| Element | Animation | Duration |
|---|---|---|
| Button press | `scale(0.97)` | 100ms |
| Card hover | `translateY(-2px)` | 150ms |
| Screen transition | slide + fade | 250ms |
| Toast/pill appear | fade + `translateY(4px→0)` | 200ms |
| Image load | fade in | 300ms |
| Skeleton loader | shimmer pulse | 1.2s loop |

No spin loops, bounce, or parallax on product/operational screens.

---

## 11. Accessibility

- Contrast: AA minimum (4.5:1 body text, 3:1 large text/UI).
- Touch targets: 44×44px minimum.
- Focus ring: 2px solid Indigo 400, 2px offset — never hidden.
- Alt text on all product images (`"Yousuf Rice Ultimate Sella 5kg bag"`).
- Don't rely on color alone — pair status with label or icon.
- **Champagne Gold** (`#D4AD54`, ~1.9:1 on white): fill only. Pair with Indigo 800 or Neutral 900 text on top of it — never use it as text color on white, never white text on it. Gold 600 (`#96762E`) is dark enough for text on white.
- **Coral 500** (`#E63946`, ~5:1 on white): fine for badges and large text. For small body text, use Coral 600 or 700.

---

## 12. Imagery

- Product photos: real bag shots on Neutral 50 or white.
- Lifestyle: Pakistani kitchen — biryani, degchi, copper pots, steam. No generic western stock.
- Aspect ratios: product card 1:1 · hero 16:9 · category icon 1:1 circle.
- Text-on-photo overlay: Neutral 900 at 40% — never pure black.

---

## 13. Tokens (CSS Variables)

```css
:root {
  /* Indigo — brand & primary action */
  --indigo-50:  #F7F7FC;
  --indigo-100: #EFEFF9;
  --indigo-200: #DCDDF2;
  --indigo-300: #C1C3E8; /* ★ light tint */
  --indigo-400: #9EA1D8;
  --indigo-500: #7A7EC4;
  --indigo-600: #5A5DA8; /* ★ primary action */
  --indigo-700: #423F8C;
  --indigo-800: #27247B; /* ★ brand + CTA */
  --indigo-900: #1A1854;

  /* Champagne Gold — accent */
  --gold-50:  #FBF8F0;
  --gold-100: #F6EDD7;
  --gold-200: #EDDBAE;
  --gold-300: #E1C480;
  --gold-400: #D4AD54; /* ★ accent */
  --gold-500: #B8923D;
  --gold-600: #96762E;
  --gold-700: #735A23;
  --gold-800: #54421A;
  --gold-900: #362B11;

  /* Coral — deals / alerts */
  --coral-50:  #FEEEEF;
  --coral-100: #FCD4D7;
  --coral-200: #F8A9AF;
  --coral-300: #F37D85;
  --coral-400: #EE525D;
  --coral-500: #E63946; /* ★ deal/alert */
  --coral-600: #C32834;
  --coral-700: #9C1F29;
  --coral-800: #74171F;
  --coral-900: #4D0E14;

  /* Neutral */
  --neutral-0:   #FFFFFF; /* ★ canvas */
  --neutral-50:  #FAFAFC;
  --neutral-100: #F3F3F7;
  --neutral-200: #E6E6ED;
  --neutral-300: #CFD0DA;
  --neutral-400: #A3A5B5;
  --neutral-500: #7B7D8F;
  --neutral-600: #565869;
  --neutral-700: #3C3E4D;
  --neutral-900: #1D1E28;

  /* Semantic aliases */
  --color-primary:    var(--indigo-600);
  --color-brand:      var(--indigo-800);
  --color-accent:     var(--gold-400);
  --color-cta:        var(--indigo-800);
  --color-warning:    var(--coral-500);
  --color-bg:         var(--neutral-0);
  --color-surface:    var(--neutral-50);
  --color-border:     var(--neutral-200);
  --color-text:       var(--neutral-900);
  --color-text-body:  var(--neutral-600);
  --color-text-muted: var(--neutral-400);

  /* Spacing */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* Radius */
  --radius-xs: 6px; --radius-sm: 10px; --radius-md: 14px;
  --radius-lg: 20px; --radius-xl: 28px; --radius-full: 9999px;
  --radius-phone: 40px;

  /* Typography — --font-ui and --font-mono come from next/font (layout.tsx) */
  --font-display: -apple-system, 'SF Pro Display', var(--font-ui), system-ui, sans-serif;
  --font-ui-stack: -apple-system, 'SF Pro Text', var(--font-ui), system-ui, sans-serif;
}
```

---

*Maintained by Yousuf Rice digital team. Update version when any token changes.*