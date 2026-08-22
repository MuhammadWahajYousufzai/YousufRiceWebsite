"use client";

import Link from "next/link";
import { getActiveStorefrontContent } from "@repo/utils";
import { ArrowRight } from "lucide-react";
import { useStorefrontContent } from "@/components/storefront-content-provider";

const themes = {
  harvest: "bg-[#6e4d22] text-white",
  midnight: "bg-[#27247b] text-white",
  saffron: "bg-[#ffff03] text-[#27247b]",
  emerald: "bg-[#176345] text-white",
  rose: "bg-[#8e3f3a] text-white",
};

export default function AnnocementBar() {
  const { contents } = useStorefrontContent();
  const announcement = getActiveStorefrontContent(
    contents,
    "web",
    "announcement",
  )[0];

  if (!announcement) return null;

  return (
    <div className={`relative isolate overflow-hidden px-4 py-2.5 ${themes[announcement.theme]}`}>
      <div className="absolute -left-12 top-1/2 h-20 w-44 -translate-y-1/2 rotate-6 rounded-full border border-current opacity-10" />
      <div className="absolute -right-12 top-1/2 h-20 w-44 -translate-y-1/2 -rotate-6 rounded-full border border-current opacity-10" />
      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-3 text-center">
        <p className="text-xs font-extrabold leading-5 sm:text-sm">
          {announcement.title}
        </p>
        {announcement.cta_text && (
          <Link
            href={announcement.cta_url || "/#products"}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            {announcement.cta_text}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
