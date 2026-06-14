"use client";

import { useEffect, useState } from "react";

interface DebugInfo {
  fbqExists: boolean;
  fbqLoaded: boolean;
  pixelScriptLoaded: boolean;
  pixelInitialized: boolean;
  pixelId: string;
  testEventCode: string;
  isInstagram: boolean;
  lastEvent: string;
  lastEventId: string;
  lastBrowserResult: string;
  lastCapiResult: string;
  userAgent: string;
  resourceTimings: string[];
  errors: string[];
}

export function MetaPixelDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    fbqExists: false,
    fbqLoaded: false,
    pixelScriptLoaded: false,
    pixelInitialized: false,
    pixelId: "",
    testEventCode: "",
    isInstagram: false,
    lastEvent: "",
    lastEventId: "",
    lastBrowserResult: "",
    lastCapiResult: "",
    userAgent: "",
    resourceTimings: [],
    errors: [],
  });
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyDebugInfo = async () => {
    await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    // Check if debug mode is enabled via query param
    const url = new URL(window.location.href);
    const debugMode = url.searchParams.has("debug_pixel");
    setIsVisible(debugMode);

    if (!debugMode) return;

    const updateDebugInfo = () => {
      const ua = navigator.userAgent || "";
      const isInsta = ua.includes("Instagram") || ua.includes("FBAN") || ua.includes("FBAV");
      
      const diagnostics = window.__metaTrackingDiagnostics;
      const fbResources = performance
        .getEntriesByType("resource")
        .filter((entry) => {
          const name = String(entry.name || "");
          return (
            name.includes("facebook") ||
            name.includes("fbevents") ||
            name.includes("connect.facebook")
          );
        })
        .map((entry) => {
          const resource = entry as PerformanceResourceTiming;
          return JSON.stringify({
            name: resource.name,
            type: resource.initiatorType,
            status: resource.responseStatus || "unknown",
            duration: Math.round(resource.duration),
            transferSize: resource.transferSize,
          });
        });

      setDebugInfo({
        fbqExists: typeof window.fbq !== "undefined",
        fbqLoaded: typeof window.fbq?.callMethod === "function",
        pixelScriptLoaded: Boolean(
          document.querySelector('script[src*="connect.facebook.net"][src*="fbevents.js"]'),
        ),
        pixelInitialized: !!window.__metaPixelInitialized,
        pixelId: process.env.NEXT_PUBLIC_META_DATASET_ID || "",
        testEventCode:
          window.__metaTestEventCode ||
          process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE ||
          "",
        isInstagram: isInsta,
        lastEvent: (window as any).__metaLastEvent || diagnostics?.lastEventName || "",
        lastEventId: (window as any).__metaLastEventId || diagnostics?.lastEventId || "",
        lastBrowserResult: diagnostics?.lastBrowserResult || "",
        lastCapiResult: diagnostics?.lastCapiResult || "",
        userAgent: ua,
        resourceTimings: fbResources,
        errors: diagnostics?.errors || [],
      });
    };

    // Initial check
    updateDebugInfo();

    // Update every second
    const interval = setInterval(updateDebugInfo, 1000);

    // Listen for custom events from tracking hook
    const handleMetaEvent = ((e: CustomEvent) => {
      (window as any).__metaLastEvent = e.detail.eventName;
      (window as any).__metaLastEventId = e.detail.eventId;
      updateDebugInfo();
    }) as EventListener;

    window.addEventListener("metaPixelEvent", handleMetaEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("metaPixelEvent", handleMetaEvent);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        color: "#fff",
        padding: "15px",
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 9999,
        maxWidth: "350px",
        border: "2px solid #ffff03",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "10px", color: "#ffff03" }}>
        Meta Pixel Debug
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Browser:</strong> {debugInfo.isInstagram ? "📱 Instagram" : "🌐 Regular"}
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>fbq exists:</strong>{" "}
        <span style={{ color: debugInfo.fbqExists ? "#4ade80" : "#f87171" }}>
          {debugInfo.fbqExists ? "✅ Yes" : "❌ No"}
        </span>
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>fbq loaded:</strong>{" "}
        <span style={{ color: debugInfo.fbqLoaded ? "#4ade80" : "#f87171" }}>
          {debugInfo.fbqLoaded ? "✅ Yes" : "❌ No"}
        </span>
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Pixel script:</strong>{" "}
        <span style={{ color: debugInfo.pixelScriptLoaded ? "#4ade80" : "#f87171" }}>
          {debugInfo.pixelScriptLoaded ? "✅ Loaded" : "❌ Missing"}
        </span>
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Pixel initialized:</strong>{" "}
        <span style={{ color: debugInfo.pixelInitialized ? "#4ade80" : "#f87171" }}>
          {debugInfo.pixelInitialized ? "✅ Yes" : "❌ No"}
        </span>
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Pixel ID:</strong> {debugInfo.pixelId}
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Test event code:</strong>{" "}
        {debugInfo.testEventCode || "None"}
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Last event:</strong> {debugInfo.lastEvent || "None"}
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Last event ID:</strong> {debugInfo.lastEventId || "None"}
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Last browser result:</strong>{" "}
        {debugInfo.lastBrowserResult || "None"}
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Last CAPI result:</strong> {debugInfo.lastCapiResult || "None"}
      </div>
      {debugInfo.resourceTimings.length > 0 && (
        <div style={{ fontSize: "10px", color: "#888", marginTop: "10px" }}>
          <strong>Meta resources:</strong>
          <pre style={{ whiteSpace: "pre-wrap", margin: "5px 0 0" }}>
            {debugInfo.resourceTimings.join("\n")}
          </pre>
        </div>
      )}
      {debugInfo.errors.length > 0 && (
        <div style={{ fontSize: "10px", color: "#f87171", marginTop: "10px" }}>
          <strong>Errors:</strong>
          <pre style={{ whiteSpace: "pre-wrap", margin: "5px 0 0" }}>
            {debugInfo.errors.join("\n")}
          </pre>
        </div>
      )}
      <div style={{ fontSize: "10px", color: "#888", marginTop: "10px" }}>
        User Agent: {debugInfo.userAgent.substring(0, 50)}...
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <button
          onClick={copyDebugInfo}
          style={{
            padding: "5px 10px",
            backgroundColor: copied ? "#22c55e" : "#27247b",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {copied ? "Copied" : "Copy Debug"}
        </button>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            padding: "5px 10px",
            backgroundColor: "#f87171",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
