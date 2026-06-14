"use client";

import { useEffect, useState } from "react";

interface DebugInfo {
  fbqExists: boolean;
  pixelInitialized: boolean;
  pixelId: string;
  isInstagram: boolean;
  lastEvent: string;
  lastEventId: string;
  userAgent: string;
}

export function MetaPixelDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    fbqExists: false,
    pixelInitialized: false,
    pixelId: "",
    isInstagram: false,
    lastEvent: "",
    lastEventId: "",
    userAgent: "",
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if debug mode is enabled via query param
    const url = new URL(window.location.href);
    const debugMode = url.searchParams.has("debug_pixel");
    setIsVisible(debugMode);

    if (!debugMode) return;

    const updateDebugInfo = () => {
      const ua = navigator.userAgent || "";
      const isInsta = ua.includes("Instagram") || ua.includes("FBAN") || ua.includes("FBAV");
      
      setDebugInfo({
        fbqExists: typeof window.fbq !== "undefined",
        pixelInitialized: !!window.__metaPixelInitialized,
        pixelId: process.env.NEXT_PUBLIC_META_DATASET_ID || "",
        isInstagram: isInsta,
        lastEvent: (window as any).__metaLastEvent || "",
        lastEventId: (window as any).__metaLastEventId || "",
        userAgent: ua,
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
        <strong>Pixel initialized:</strong>{" "}
        <span style={{ color: debugInfo.pixelInitialized ? "#4ade80" : "#f87171" }}>
          {debugInfo.pixelInitialized ? "✅ Yes" : "❌ No"}
        </span>
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Pixel ID:</strong> {debugInfo.pixelId}
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Last event:</strong> {debugInfo.lastEvent || "None"}
      </div>
      <div style={{ marginBottom: "5px" }}>
        <strong>Last event ID:</strong> {debugInfo.lastEventId || "None"}
      </div>
      <div style={{ fontSize: "10px", color: "#888", marginTop: "10px" }}>
        User Agent: {debugInfo.userAgent.substring(0, 50)}...
      </div>
      <button
        onClick={() => setIsVisible(false)}
        style={{
          marginTop: "10px",
          padding: "5px 10px",
          backgroundColor: "#f87171",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  );
}
