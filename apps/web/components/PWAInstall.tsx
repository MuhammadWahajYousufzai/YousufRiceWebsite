"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function PWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.log("Service Worker registration failed:", error);
        });
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Check for dismissal cooldown
      const dismissedAt = localStorage.getItem("pwa_install_dismissed_at");
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        const now = Date.now();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        if (now - dismissedTime < threeDaysInMs) {
          return;
        }
      }

      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed_at", Date.now().toString());
    setShowPrompt(false);
  };

  // Show iOS installation instructions
  if (isIOS && showPrompt) {
    return (
      <div className="fixed bottom-20 right-4 bg-white rounded-lg shadow-lg p-3 max-w-xs z-50 border border-[#27247b]/20">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-[#27247b] text-sm">Install App</h3>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-600 mb-2">
          Tap the share button and select "Add to Home Screen" to install Yousuf
          Rice app.
        </p>
        <div className="w-full h-1.5 bg-linear-to-r from-[#27247b] to-[#ffff0b] rounded-full mb-2"></div>
      </div>
    );
  }

  // Show install prompt for other browsers
  if (isInstallable && showPrompt && !isIOS) {
    return (
      <>
        {/* Mobile Layout - Bottom Sheet/Banner */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom duration-500 border-t border-gray-100">
          <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
            <div className="flex-1 mr-4">
              <h3 className="font-bold text-[#27247b] text-sm mb-1">
                Install Yousuf Rice App
              </h3>
              <p className="text-xs text-gray-500">
                Get the best experience with our native app.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleInstall}
                className="bg-[#27247b] text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg active:scale-95 transition-transform"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Floating Pill */}
        <div className="hidden md:flex fixed bottom-6 right-6 z-50 animate-in fade-in zoom-in duration-300">
          <div className="relative group">
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 bg-gray-100 text-gray-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:bg-gray-200"
            >
              <X size={12} />
            </button>
            <button
              onClick={handleInstall}
              className="bg-white hover:bg-gray-50 text-[#27247b] flex items-center gap-3 px-5 py-2.5 rounded-full shadow-xl border border-gray-100 transition-all hover:scale-105 active:scale-95"
            >
              <div className="bg-[#27247b]/10 p-1.5 rounded-full text-[#27247b]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
              </div>
              <span className="font-semibold text-sm">Install App</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
