"use client";
import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const isPushEnabled =
  process.env.NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === "true";

export default function PushNotificationButton() {
  // Feature flag: return null if push notifications are disabled
  if (!isPushEnabled) {
    return null;
  }
  const [status, setStatus] = useState<
    "idle" | "loading" | "subscribed" | "denied" | "unsupported"
  >("idle");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") setStatus("subscribed");
    if (Notification.permission === "denied") setStatus("denied");
  }, []);

  const handleSubscribe = async () => {
    if (status !== "idle") return;
    setStatus("loading");

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      const subJson = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        }),
      });

      setStatus("subscribed");
    } catch (err) {
      console.error("Push subscription error:", err);
      setStatus("denied");
    }
  };

  const config = {
    idle: {
      label: "Notifications for Best Deals",
      sub: "Offers & discounts — straight to you",
      note: "Tap once — we'll never spam you",
      pulse: true,
    },
    loading: {
      label: "Enabling notifications…",
      sub: "Asking browser permission",
      note: "",
      pulse: false,
    },
    subscribed: {
      label: "You're subscribed!",
      sub: "Best deals will come straight to you",
      note: "Manage anytime in browser settings",
      pulse: false,
    },
    denied: {
      label: "Notifications blocked",
      sub: "Enable in your browser settings",
      note: "",
      pulse: false,
    },
    unsupported: {
      label: "Not supported",
      sub: "Your browser does not support push notifications",
      note: "",
      pulse: false,
    },
  };

  const c = config[status];
  const isDisabled =
    status === "loading" ||
    status === "subscribed" ||
    status === "denied" ||
    status === "unsupported";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500&family=DM+Sans:wght@400;500&display=swap');

        .pnb-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .pnb-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #888780;
        }

        .pnb-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 18px 32px;
          background: #fff;
          border: 0.5px solid rgba(0,0,0,0.18);
          border-radius: 100px;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease;
          outline: none;
        }

        .pnb-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: rgba(0,0,0,0.35); }
        .pnb-btn:active:not(:disabled) { transform: scale(0.97); }
        .pnb-btn:disabled { cursor: default; }

        .pnb-btn.subscribed { background: #E1F5EE; border-color: #1D9E75; }
        .pnb-btn.denied, .pnb-btn.unsupported { background: #FCEBEB; border-color: #E24B4A; }

        .pnb-bell-wrap { position: relative; width: 24px; height: 24px; flex-shrink: 0; }

        .pnb-bell {
          width: 22px; height: 22px;
          color: #2C2C2A;
          transition: color 0.2s;
        }

        .pnb-btn.subscribed .pnb-bell { color: #085041; }
        .pnb-btn.denied .pnb-bell, .pnb-btn.unsupported .pnb-bell { color: #501313; }

        .pnb-btn:not(.subscribed):not(.denied):not(.unsupported):hover .pnb-bell {
          animation: pnb-ring 0.5s ease;
        }

        @keyframes pnb-ring {
          0%  { transform: rotate(0deg); }
          15% { transform: rotate(18deg); }
          35% { transform: rotate(-16deg); }
          55% { transform: rotate(12deg); }
          75% { transform: rotate(-8deg); }
          90% { transform: rotate(4deg); }
          100%{ transform: rotate(0deg); }
        }

        .pnb-badge {
          position: absolute;
          top: -4px; right: -4px;
          width: 10px; height: 10px;
          background: #D85A30;
          border-radius: 50%;
          border: 1.5px solid #fff;
          animation: pnb-pulse 2s infinite;
        }

        @keyframes pnb-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.35); opacity: 0.65; }
        }

        .pnb-text { display: flex; flex-direction: column; gap: 2px; text-align: left; }

        .pnb-label {
          font-family: 'Playfair Display', serif;
          font-size: 15px;
          font-weight: 500;
          color: #2C2C2A;
          line-height: 1.2;
        }

        .pnb-btn.subscribed .pnb-label { color: #085041; }
        .pnb-btn.denied .pnb-label, .pnb-btn.unsupported .pnb-label { color: #501313; }

        .pnb-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 400;
          color: #5F5E5A;
          letter-spacing: 0.02em;
        }

        .pnb-btn.subscribed .pnb-sub { color: #0F6E56; }
        .pnb-btn.denied .pnb-sub, .pnb-btn.unsupported .pnb-sub { color: #A32D2D; }

        .pnb-arrow {
          width: 16px; height: 16px;
          color: #888780;
          transition: transform 0.2s ease, color 0.2s ease;
          flex-shrink: 0;
        }

        .pnb-btn:hover .pnb-arrow { transform: translateX(2px); color: #2C2C2A; }

        .pnb-note {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: #888780;
          text-align: center;
          min-height: 16px;
        }

        @keyframes pnb-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .pnb-spinner {
          width: 16px; height: 16px;
          border: 1.5px solid #D3D1C7;
          border-top-color: #2C2C2A;
          border-radius: 50%;
          animation: pnb-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
      `}</style>

      <div className="pnb-wrap">
        <p className="pnb-eyebrow">Never miss a deal</p>

        <button
          className={`pnb-btn ${status !== "idle" && status !== "loading" ? status : ""}`}
          onClick={handleSubscribe}
          disabled={isDisabled}
          aria-label="Subscribe to push notifications for best deals, offers and discounts"
        >
          {/* Bell or spinner */}
          <div className="pnb-bell-wrap">
            {status === "loading" ? (
              <div className="pnb-spinner" />
            ) : (
              <>
                <svg
                  className="pnb-bell"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {c.pulse && <div className="pnb-badge" />}
              </>
            )}
          </div>

          {/* Text */}
          <div className="pnb-text">
            <span className="pnb-label">{c.label}</span>
            <span className="pnb-sub">{c.sub}</span>
          </div>

          {/* Arrow — only when idle */}
          {status === "idle" && (
            <svg
              className="pnb-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}

          {/* Check — when subscribed */}
          {status === "subscribed" && (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1D9E75"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}

          {/* X — when denied */}
          {(status === "denied" || status === "unsupported") && (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E24B4A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </button>

        {c.note && <p className="pnb-note">{c.note}</p>}
      </div>
    </>
  );
}
