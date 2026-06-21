"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function AdminOrderRouteModal({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/55 p-2 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
        className="relative max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto rounded-2xl bg-gray-50 p-3 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-6"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Close order details"
          className="sticky top-0 z-10 ml-auto flex h-9 w-9 items-center justify-center rounded-full border bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mt-2">{children}</div>
      </section>
    </div>
  );
}
