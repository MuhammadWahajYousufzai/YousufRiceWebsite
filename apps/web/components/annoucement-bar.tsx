import { XIcon } from "lucide-react";
import Link from "next/link";

export default function AnnocementBar() {
  const announcementText =
    process.env.NEXT_PUBLIC_ENABLE_RAMADAN_OFFER === "true"
      ? "⏳ HURRY! Offer Ends Soon: Get 1kg FREE Rice for every 15kg! Free Delivery & up to 24% OFF."
      : "Yousuf Rice 2026 - Now delivering premium rice with Free Delivery across Karachi!";

  return (
    <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gray-50 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
          }}
          className="aspect-577/310 w-144.25 bg-linear-to-r from-[#27247b] via-[#f9e97f] to-[#fff93d] opacity-40"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
      >
        <div
          style={{
            clipPath:
              "polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)",
          }}
          className="aspect-577/310 w-144.25 bg-linear-to-r from-[#27247b] via-[#f9e97f] to-[#fff93d] opacity-40"
        />
      </div>
      <div className="flex flex-nowrap items-center gap-x-2 sm:gap-x-4 gap-y-2">
        <p className="text-xs sm:text-sm/6 text-gray-900">
          <strong className="font-semibold">{announcementText}</strong>
        </p>
        <Link
          href="/#products"
          className="flex-none rounded-full bg-gray-900 px-2 sm:px-3.5 py-1 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 whitespace-nowrap"
        >
          Order now <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <div className="flex flex-1 justify-end">
        <button
          type="button"
          className="-m-3 p-3 focus-visible:-outline-offset-4"
        >
          <span className="sr-only">Dismiss</span>
          <XIcon aria-hidden="true" className="size-5 text-gray-900 hidden" />
        </button>
      </div>
    </div>
  );
}
