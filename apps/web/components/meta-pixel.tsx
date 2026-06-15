"use client";

import Script from "next/script";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMetaTracking } from "@/lib/hooks/use-meta-tracking";

// 2025: Use Dataset ID for unified browser + server tracking
const META_DATASET_ID = process.env.NEXT_PUBLIC_META_DATASET_ID;
const META_TEST_EVENT_CODE = process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE;

function MetaPixelContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { trackPageView } = useMetaTracking();

  useEffect(() => {
    if (!META_DATASET_ID) return;

    // Track page views on route change
    trackPageView();
  }, [pathname, searchParams, trackPageView]);

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
            ${META_TEST_EVENT_CODE ? `fbq('set', 'test_event_code', '${META_TEST_EVENT_CODE}');` : ""}
            window.__metaPixelInitialized = true;
            window.__metaTestEventCode = '${META_TEST_EVENT_CODE || ""}';
            console.log('[Meta Pixel] Initialized with dataset ID: ${META_DATASET_ID}');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_DATASET_ID}&ev=PageView&noscript=1${META_TEST_EVENT_CODE ? `&test_event_code=${META_TEST_EVENT_CODE}` : ""}`}
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
