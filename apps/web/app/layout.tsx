import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MetaPixel } from "@/components/meta-pixel";
import FloatingChatbox from "@/components/floating-chatbox";
import { PWAInstall } from "@/components/PWAInstall";
import PushNotificationButton from "@/components/PushNotificationButton";
import { FloatingPushNotification } from "@/components/FloatingPushNotification";
import "./globals.css";
import AnnocementBar from "@/components/annoucement-bar";
import { Suspense } from "react";
import { ImageProtection } from "@/components/image-protection";
import { Popup } from "@/components/popup";
import { CartDrawer } from "@/components/cart-drawer";
import { Playfair_Display, Poppins } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-playfair",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
});


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Support multiple domains - uses primary domain for metadata
const primaryDomain =
  process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || "https://yousufrice.com";

// Validate URL format - if invalid, use fallback
let metadataBaseUrl: URL;
try {
  metadataBaseUrl = new URL(primaryDomain);
} catch {
  console.warn(
    `Invalid NEXT_PUBLIC_PRIMARY_DOMAIN: "${primaryDomain}". Using fallback.`
  );
  metadataBaseUrl = new URL("https://yousufrice.com");
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  alternates: {
    canonical: "/",
  },
  title: {
    default:
      "Yousuf Rice - Premium Quality Rice With Free Delivery | Best Prices in Pakistan",
    template: "%s | Yousuf Rice",
  },
  description:
    "Order premium quality basmati and sella rice online with discounts, free delivery, and cash on delivery. Every Grain XXXL, Steam Rice, Sella Rice, and Bachat varieties available.",
  keywords: [
    "SS Rice",
    "SSRice",
    "SS Rice Mills",
    "SS Rice Mill",
    "SS International",
    "rice delivery",
    "basmati rice",
    "sella rice",
    "steam rice",
    "premium rice Pakistan",
    "buy rice online",
    "rice home delivery",
    "Yousuf Rice",
    "Every Grain rice",
    "bulk rice order",
    "cash on delivery rice",
  ],
  authors: [{ name: "Yousuf Rice" }],
  creator: "Yousuf Rice",
  publisher: "Yousuf Rice",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: primaryDomain,
    siteName: "Yousuf Rice - Part of SS International",
    title: "Yousuf Rice - Premium Quality Rice Delivery",
    description:
      "Order premium quality rice online with Discounts, free delivery, and cash on delivery. Best prices in Pakistan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yousuf Rice - Premium Quality Rice Delivery",
    description:
      "Order premium quality rice online with tier-based pricing and free delivery",
  },
  verification: {
    other: {
      "facebook-domain-verification": "r6916j8ribq3asb275o4dejdttfgqy",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Yousuf Rice",
  alternateName: [
    "SS Rice",
    "SS Rice Mills",
    "SSRice",
    "Yousuf Rice Mill",
    "SS International",
  ],
  url: "https://yousufrice.com",
  logo: "https://yousufrice.com/images/logo.png",
  sameAs: ["https://ssricemills.com", "https://yousufricemill.com"],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+92-304-1117423",
    contactType: "customer service",
    areaServed: "PK",
    availableLanguage: "en",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`scroll-smooth ${playfair.variable} ${poppins.variable}`}>
      <head>
        <MetaPixel />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Transitions removed */}

        {/* Wrap dynamic components in Suspense for PPR */}
        <Suspense fallback={null}>
          <AnnocementBar />
        </Suspense>
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main className="min-h-screen bg-white">
          {/* Children already have their own Suspense boundaries */}
          {children}
        </main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
        <Suspense fallback={null}>
          <Toaster position="top-right" />
        </Suspense>
        <Suspense fallback={null}>
          <FloatingChatbox />
        </Suspense>
        <Suspense fallback={null}>
          <PWAInstall />
        </Suspense>
        <Suspense fallback={null}>
          <FloatingPushNotification />
        </Suspense>
        <Suspense fallback={null}>
          <Popup />
        </Suspense>
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
        <ImageProtection />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}

