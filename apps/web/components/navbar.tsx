"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, User, LogOut, ChevronDown } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useEffect, useState, useRef } from "react";
import {
  Navbar as AceternityNavbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarButton,
} from "./ui/resizable-navbar";

export function Navbar() {
  const { user, isAdmin, isReadOnly, checkAuth, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Track cart drawer state to pause blob animation when open (performance optimization)
  useEffect(() => {
    setIsCartOpen(useCartStore.getState().isOpen);

    const unsubscribe = useCartStore.subscribe((state) => {
      setIsCartOpen(state.isOpen);
    });

    return unsubscribe;
  }, []);

  // Log auth status for debugging
  useEffect(() => {
    console.log("Auth status:", {
      user: !!user,
      isAdmin,
      isReadOnly,
      canAccessAdmin: isAdmin || isReadOnly,
    });
  }, [user, isAdmin, isReadOnly]);

  // Prevent hydration mismatch by only reading cart on client
  useEffect(() => {
    setTotalItems(useCartStore.getState().getTotalItems());
    setIsHighlighted(useCartStore.getState().isHighlighted);

    const unsubscribe = useCartStore.subscribe((state) => {
      setTotalItems(state.getTotalItems());
      setIsHighlighted(state.isHighlighted);
    });

    return unsubscribe;
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    }

    if (isProfileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isProfileDropdownOpen]);

  const navItems = [
    { name: "Products", link: "/#products" },
    { name: "Special Deals", link: "/special-deals", highlight: true },
    { name: "About Us", link: "/about" },
    { name: "Contact", link: "/contact" },
    // Manual tracking temporarily disabled - uncomment below to enable
    // { name: user ? "My Orders" : "Track Order", link: user ? "/orders" : "/track-order" },
    ...(user ? [{ name: "My Orders", link: "/orders" }] : []),
    ...(isAdmin || isReadOnly ? [{ name: "Admin", link: "/admin" }] : []),
  ];

  const handleMobileItemClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <AceternityNavbar className="sticky top-0">
      {/* Desktop Navigation */}
      <NavBody>
        {/* Logo */}
        <Link
          href="/"
          className="relative z-20 flex items-center space-x-3 px-2 py-1    "
        >
          <Image
            src="/logo.png"
            alt="Yousuf Rice Logo"
            width={100}
            height={100}
            className="object-contain    "
            priority
            quality={90}
          />
          <span className="text-xl font-bold text-[#27247b] dark:text-white">
            Yousuf Rice
          </span>
        </Link>

        {/* Nav Items */}
        <NavItems items={navItems} />

        {/* Right Side Actions */}
        <div className="relative z-20 flex items-center space-x-2">
          {/* Cart */}
          <div className="relative inline-block">
            <button
              onClick={() => useCartStore.getState().setIsOpen(true)}
              className={`relative z-10 flex items-center justify-center p-2 text-[#27247b] hover:text-[#27247b]/80 dark:text-neutral-300 dark:hover:text-white transition-all duration-300 rounded-full overflow-hidden ${
                totalItems > 0 && !isHighlighted
                  ? "shadow-md bg-white border border-[#ffff03]/50"
                  : ""
              } ${
                isHighlighted
                  ? "scale-125 ring-2 ring-[#ffff03] bg-yellow-100 dark:bg-yellow-900/30 shadow-lg"
                  : ""
              }`}
            >
              {totalItems > 0 && !isHighlighted && !isCartOpen && (
                <div className="absolute inset-0 pointer-events-none -z-10 bg-white">
                  <div className="fluid-bg">
                    <div className="blob-1"></div>
                    <div className="blob-2"></div>
                    <div className="blob-3"></div>
                  </div>
                </div>
              )}
              <ShoppingCart className="w-5 h-5 relative z-10 text-zinc-600" />
            </button>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#ffff03] text-[#27247b] border-2 border-white dark:border-neutral-900 text-[10px] sm:text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center pointer-events-none z-20 transition-transform shadow-sm">
                {totalItems}
              </span>
            )}
          </div>

          {/* Auth Section */}
          {user ? (
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition text-[#27247b] dark:text-neutral-300"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {user.name || user.email}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-800 z-50">
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center space-x-2 px-4 py-3 text-[#27247b] dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition first:rounded-t-lg"
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-3 text-[#27247b] dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition last:rounded-b-lg border-t border-gray-200 dark:border-neutral-800"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavbarButton
              href="/auth/login"
              className="bg-[#ffff03] text-[#27247b] hover:bg-[#ffff03]/90 font-bold  "
            >
              <User className="w-4 h-4 mr-2 inline  " />
              Login
            </NavbarButton>
          )}
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader className=" -navbar">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 px-2 py-1    ">
            <Image
              src="/logo.png"
              alt="Yousuf Rice Logo"
              width={40}
              height={40}
              className="object-fit    "
              priority
              quality={90}
            />
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2">
            {/* Cart */}
            <div className="relative inline-block">
              <button
                onClick={() => useCartStore.getState().setIsOpen(true)}
                className={`relative z-10 flex items-center justify-center p-2 text-[#27247b] hover:text-[#27247b]/80 dark:text-neutral-300 dark:hover:text-white transition-all duration-300 rounded-full overflow-hidden ${
                  totalItems > 0 && !isHighlighted
                    ? "shadow-md bg-white border border-[#ffff03]/50"
                    : ""
                } ${
                  isHighlighted
                    ? "scale-125 ring-2 ring-[#ffff03] bg-yellow-100 dark:bg-yellow-900/30 shadow-lg"
                    : ""
                }`}
              >
                {totalItems > 0 && !isHighlighted && !isCartOpen && (
                  <div className="absolute inset-0 pointer-events-none -z-10 bg-white">
                    <div className="fluid-bg">
                      <div className="blob-1"></div>
                      <div className="blob-2"></div>
                      <div className="blob-3"></div>
                    </div>
                  </div>
                )}
                <ShoppingCart className="w-5 h-5 relative z-10 text-[#27247b]" />
              </button>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#ffff03] text-[#27247b] border-2 border-white dark:border-neutral-900 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center pointer-events-none z-20 shadow-sm transition-transform">
                  {totalItems}
                </span>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </div>
        </MobileNavHeader>

        {/* Mobile Menu */}
        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          {navItems.map((item, idx) => (
            <Link
              key={`mobile-link-${idx}`}
              href={item.link}
              onClick={handleMobileItemClick}
              className="text-[#27247b] dark:text-neutral-300 hover:text-[#27247b]/80 dark:hover:text-white   text-base font-medium"
            >
              {item.name}
            </Link>
          ))}

          {/* Auth Section in Mobile Menu */}
          {user ? (
            <div className="flex flex-col space-y-3 w-full pt-4 border-t border-[#27247b]/20 dark:border-neutral-800">
              <span className="text-sm text-[#27247b] dark:text-neutral-300 font-medium">
                {user.name || user.email}
              </span>
              <Link
                href="/profile"
                onClick={handleMobileItemClick}
                className="flex items-center space-x-2 text-[#27247b] dark:text-neutral-300 hover:text-[#27247b]/80 dark:hover:text-white"
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-2 text-[#27247b] dark:text-neutral-300 hover:text-[#27247b]/80 dark:hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="w-full pt-4 border-t border-[#27247b]/20 dark:border-neutral-800">
              <a
                href="/auth/login"
                onClick={handleMobileItemClick}
                className="flex items-center justify-center space-x-2 bg-[#ffff03] text-[#27247b] hover:bg-[#ffff03]/90   text-base font-bold py-3 px-6 rounded-lg"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </a>
            </div>
          )}
        </MobileNavMenu>
      </MobileNav>
    </AceternityNavbar>
  );
}
