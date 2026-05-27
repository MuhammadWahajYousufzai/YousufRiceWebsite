"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatBox from "./chat-box";
import { useAuthStore } from "@/lib/store/auth-store";
import { Button } from "./ui/button";
import { useRouter, usePathname } from "next/navigation";

/**
 * FloatingChatbox Component
 * A modern, minimizable chatbox widget that appears on all pages
 * Requires authentication to use
 * Messages persist until browser reload
 */
export default function FloatingChatbox() {
  const router = useRouter();
  const { user, customer, checkAuth } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const pathname = usePathname();
  const isLoginPage = pathname === "/auth/login";

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setHasCheckedAuth(true);
    };
    initAuth();
  }, [checkAuth]);

  // Don't render until auth check is complete
  if (!hasCheckedAuth) {
    return null;
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-linear-to-br from-green-600 to-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center group"
          aria-label="Open chat"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />

          {/* Waving Hand Greeting */}
          {!isLoginPage && (
            <div className="absolute -top-16 right-0 bg-white text-gray-800 px-4 py-2 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-2 transition-all duration-300 hover:scale-105 origin-bottom-right">
              <span className="text-sm font-medium whitespace-nowrap">Hi there!</span>
              <span className="animate-wave text-xl">👋</span>
              {/* Speech bubble tail */}
              <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-b border-r border-gray-100 transform rotate-45"></div>
            </div>
          )}

          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat with us!
          </span>
        </button>
      )}

      {/* Chat Window - Only show when not minimized */}
      {isOpen && !isMinimized && (
        <div
          className={cn(
            "fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300",
            "bottom-6 right-6 w-100 h-150 max-h-[calc(100vh-3rem)]",
            "sm:w-100",
            "max-sm:w-[calc(100vw-2rem)]! max-sm:right-4! max-sm:bottom-4!"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Yousuf Rice Assistant</h3>
                <p className="text-xs text-white/80">We're here to help!</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleMinimize}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                aria-label="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(100%-3.5rem)]">
            {user ? (
              <ChatBox
                userId={user.email}
                welcomeMessage={`Assalam o Alaikum${user.name ? ", " + user.name : ""
                  }! Yousuf Rice mein khush aamdeed. Main aaj aapki kis tarah madad kar sakta hoon?`}
                placeholder="Type your message..."
                className="h-full border-0 rounded-none rounded-b-lg shadow-none"
                userContext={{
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Login Required
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Please log in to chat with our Customer Support.
                </p>
                <div className="space-y-2 w-full">
                  <Button
                    onClick={() => router.push("/auth/login")}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => router.push("/auth/register")}
                    variant="outline"
                    className="w-full"
                  >
                    Create Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimized Chat Button - Shows animated icon */}
      {isOpen && isMinimized && (
        <button
          onClick={toggleMinimize}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-linear-to-br from-green-600 to-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center group"
          aria-label="Expand chat"
        >
          <MessageSquare className="w-6 h-6 animate-bounce" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />

          {/* Tooltip */}
          <span className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Click to expand
          </span>
        </button>
      )}
    </>
  );
}
