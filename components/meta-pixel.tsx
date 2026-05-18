"use client";

import Script from "next/script";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMetaTracking } from "@/lib/hooks/use-meta-tracking";

// 2025: Use Dataset ID for unified browser + server tracking
const META_DATASET_ID = process.env.NEXT_PUBLIC_META_DATASET_ID;

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
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            var _mpvid = 'pv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
            fbq('init', '${META_DATASET_ID}');
            fbq('track', 'PageView', {}, { eventID: _mpvid });
            window.__metaPageViewEventId = _mpvid;`}
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
