"use cache";

import Link from "next/link";
import { MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";

export async function Footer() {
  return (
    <footer className="bg-linear-to-br from-[#27247b] to-[#1a1854] text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold text-[#ffff03] mb-1">
              Yousuf Rice
            </h3>
            <p className="text-[#ffff03]/80 text-xs font-semibold uppercase tracking-wider mb-4">
              © Yousuf Rice | A Brand of SS International
            </p>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              Premium quality rice delivered to your doorstep. Experience the
              finest selection of rice varieties for your family.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/yousufrice/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-[#ffff03] hover:text-[#27247b] p-2.5 rounded-full transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/yousufricee"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-[#ffff03] hover:text-[#27247b] p-2.5 rounded-full transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold text-[#ffff03] mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-white/80 hover:text-[#ffff03] transition-colors text-sm flex items-center group"
                >
                  <span className="mr-2 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/#products"
                  className="text-white/80 hover:text-[#ffff03] transition-colors text-sm flex items-center group"
                >
                  <span className="mr-2 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                  Products
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-white/80 hover:text-[#ffff03] transition-colors text-sm flex items-center group"
                >
                  <span className="mr-2 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-white/80 hover:text-[#ffff03] transition-colors text-sm flex items-center group"
                >
                  <span className="mr-2 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/track-order"
                  className="text-white/80 hover:text-[#ffff03] transition-colors text-sm flex items-center group"
                >
                  <span className="mr-2 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-bold text-[#ffff03] mb-4">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/80 text-sm">
                <Phone className="w-5 h-5 text-[#ffff03] shrink-0" />
                <a
                  href="tel:+923332339557"
                  className="hover:text-[#ffff03] transition-colors"
                >
                  03041117423
                </a>
              </li>
              <li className="flex items-center gap-3 text-white/80 text-sm">
                <Mail className="w-5 h-5 text-[#ffff03] shrink-0" />
                <a
                  href="mailto:support@yousufrice.com"
                  className="hover:text-[#ffff03] transition-colors"
                >
                  support@yousufrice.com
                </a>
              </li>
            </ul>
            <div className="mt-4">
              <Link
                href="/contact"
                className="inline-block bg-[#ffff03] text-[#27247b] px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-white transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Contact Us Page
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-8 pt-6 text-center">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} Yousuf Rice. All rights reserved.
          </p>
          <p className="text-white/60 text-sm mt-2">
            Design and developed by{" "}
            <a
              href="https://contra.com/muhammadwahajofficiall_f1yj87dw/services"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#ffff03] transition-colors underline decoration-dotted underline-offset-4"
            >
              Muhammad Wahaj
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
