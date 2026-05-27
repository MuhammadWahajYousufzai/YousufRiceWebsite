import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="text-center">
        {/* 404 Text */}
        <h1 className="text-9xl font-bold text-[#27247b]">404</h1>
        
        {/* Message */}
        <h2 className="mt-4 text-3xl font-semibold text-gray-900">
          Page Not Found
        </h2>
        <p className="mt-2 text-lg text-gray-600">
          Sorry, we couldn't find the page you're looking for.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#27247b] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#27247b]/90"
          >
            <Home className="h-5 w-5" />
            Go Home
          </Link>
          <Link
            href="/#products"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#27247b] bg-white px-6 py-3 text-base font-semibold text-[#27247b] shadow-sm transition hover:bg-gray-50"
          >
            <Search className="h-5 w-5" />
            Browse Products
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-sm text-gray-500">
          <p>
            Need help?{" "}
            <Link href="/contact" className="text-[#27247b] hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
