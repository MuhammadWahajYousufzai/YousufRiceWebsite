"use client";

import Script from "next/script";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMetaTracking } from "@/lib/hooks/use-meta-tracking";
import { useAuthStore } from "@/lib/store/auth-store";
import { getAgentLabelFromLabels } from "@/lib/tracking/order-channel";

// 2025: Use Dataset ID for unified browser + server tracking
const META_DATASET_ID = process.env.NEXT_PUBLIC_META_DATASET_ID;

function MetaPixelContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { trackPageView } = useMetaTracking();
  const { user, checkAuth } = useAuthStore();

  const agentLabel = getAgentLabelFromLabels(user?.labels);
  const isAgent = Boolean(agentLabel);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!META_DATASET_ID || isAgent) return;

    // Track page views on route change
    trackPageView();
  }, [pathname, searchParams, trackPageView, isAgent]);

  // Don't load pixel if the logged-in user is an agent (Kiran/Saima)
  if (isAgent) return null;

  if (!META_DATASET_ID) {
    console.warn(
      "NEXT_PUBLIC_META_DATASET_ID not found in environment variables",
    );
    return null;
  }

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive" data-meta-pixel="true">
        {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('set', 'autoConfig', false, '${META_DATASET_ID}');
            fbq('init', '${META_DATASET_ID}');
            window.__metaPixelInitialized = true;
            console.log('[Meta Pixel] Initialized with dataset ID: ${META_DATASET_ID}');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_DATASET_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

export function MetaPixel() {
  return (
    <Suspense fallback={null}>
      <MetaPixelContent />
    </Suspense>
  );
}
