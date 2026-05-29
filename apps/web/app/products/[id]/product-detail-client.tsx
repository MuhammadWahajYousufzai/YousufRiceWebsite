"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCartStore } from "@/lib/store/cart-store";
import {
  Plus,
  Minus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { formatCurrency, getPricePerKg, calculatePrice } from "@/lib/utils";
import { useMetaTracking } from "@/lib/hooks/use-meta-tracking";
import {
  getAgentLabelFromLabels,
  getOrderChannelFromAgentLabel,
} from "@/lib/tracking/order-channel";
import { useBagSelection } from "@/lib/hooks/use-bag-selection";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface ProductDetailClientProps {
  product: Product;
  imageUrls: string[];
  primaryImageIndex: number;
  bundleImageIndex?: number;
}

export default function ProductDetailClient({
  product,
  imageUrls,
  primaryImageIndex,
  bundleImageIndex,
}: ProductDetailClientProps) {
  const [isBuyNowHovered, setIsBuyNowHovered] = useState(false);
  const { trackViewContent, trackAddToCart, trackInitiateCheckout } =
    useMetaTracking();
  const hasTrackedViewRef = useRef(false);
  const { user } = useAuthStore();
  const { items: cartItems } = useCartStore();

  const agentLabel = getAgentLabelFromLabels(user?.labels);
  const isAgent = Boolean(agentLabel);
  const orderChannel = getOrderChannelFromAgentLabel(agentLabel);

  const searchParams = useSearchParams();
  const isColdDrinkBundle =
    searchParams?.get("bundle") === "colddrink" &&
    process.env.NEXT_PUBLIC_ENABLE_COLD_DRINK_BUNDLE === "true";

  const [selectedImageIndex, setSelectedImageIndex] = useState(
    isColdDrinkBundle && bundleImageIndex !== undefined
      ? bundleImageIndex
      : primaryImageIndex,
  );

  const {
    bagCounts,
    totalKg,
    pricePerKg,
    totalPrice,
    handleAddBag,
    handleRemoveBag,
    handleBuyNow: buyNow,
  } = useBagSelection(product, isColdDrinkBundle);

  // Track ViewContent event when product page loads
  useEffect(() => {
    if (hasTrackedViewRef.current) return;
    if (isAgent) {
      hasTrackedViewRef.current = true;
      return;
    }

    // Don't send user data if it's an agent
    const userData =
      user && !isAgent
        ? {
            email: user.email,
            phone: user.phone,
            externalId: user.$id,
            firstName: user.name?.split(" ")[0],
            lastName: user.name?.split(" ").slice(1).join(" "),
          }
        : undefined;

    trackViewContent({
      contentName: product.name,
      contentId: product.$id,
      contentType: "product",
      value: totalPrice,
      currency: "PKR",
      userData,
      trackingContext: {
        orderChannel,
        agentLabel,
        placedByUserId: user?.$id,
      },
    });

    hasTrackedViewRef.current = true;
  }, [
    agentLabel,
    isAgent,
    orderChannel,
    product.$id,
    product.name,
    totalPrice,
    trackViewContent,
    user,
  ]);

  // Wrapper for handleAddBag with AddToCart tracking
  const onAddBag = (weight: 3 | 5 | 10 | 25) => {
    if (isAgent) {
      handleAddBag(weight);
      return;
    }

    const newTotalKg = totalKg + weight;
    const newTotalPrice = calculatePrice(product, newTotalKg);

    const userData =
      user && !isAgent
        ? {
            email: user.email,
            phone: user.phone,
            externalId: user.$id,
            firstName: user.name?.split(" ")[0],
            lastName: user.name?.split(" ").slice(1).join(" "),
          }
        : undefined;

    trackAddToCart({
      contentName: product.name,
      contentId: product.$id,
      value: newTotalPrice,
      currency: "PKR",
      quantity: newTotalKg,
      userData,
      trackingContext: {
        orderChannel,
        agentLabel,
        placedByUserId: user?.$id,
      },
    });

    handleAddBag(weight);
  };

  // Wrapper for handleBuyNow with analytics tracking
  const handleBuyNow = () => {
    if (totalKg === 0) {
      return; // Hook already shows error toast
    }

    // Track InitiateCheckout event (skip for agents)
    if (!isAgent) {
      // Don't send user data if it's an agent
      const userData =
        user && !isAgent
          ? {
              email: user.email,
              phone: user.phone,
              externalId: user.$id,
              firstName: user.name?.split(" ")[0],
              lastName: user.name?.split(" ").slice(1).join(" "),
            }
          : undefined;

      trackInitiateCheckout({
        value: totalPrice,
        currency: "PKR",
        numItems: totalKg,
        contentIds: [product.$id],
        userData,
        trackingContext: {
          orderChannel,
          agentLabel,
          placedByUserId: user?.$id,
        },
        stableKey: `${product.$id}:${totalKg}`,
      });
    }

    // Call the hook's buyNow function
    buyNow();
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImage = () => {
    setSelectedImageIndex(
      (prev) => (prev - 1 + imageUrls.length) % imageUrls.length,
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <Link
          href="/#products"
          className="inline-flex items-center text-[#27247b] hover:text-[#27247b]/80 mb-4 sm:mb-6 font-semibold transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm sm:text-base">Back to Products</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12 items-start">
          {/* Image Gallery */}
          <div className="space-y-3 sm:space-y-4 lg:sticky lg:top-24 h-fit">
            <div className="relative aspect-square bg-linear-to-br from-[#27247b]/5 to-[#ffff03]/10 rounded-lg sm:rounded-2xl overflow-hidden shadow-lg border-2 border-transparent hover:border-[#ffff03]/40 transition-all duration-300">
              {imageUrls.length > 0 ? (
                <>
                  <Image
                    src={imageUrls[selectedImageIndex] || "/placeholder.svg"}
                    alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                    fill
                    className="object-contain p-4 sm:p-6 md:p-8"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                    quality={85}
                  />
                  {imageUrls.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-[#27247b] hover:bg-[#27247b]/90 p-2 sm:p-3 rounded-full shadow-xl transition-all hover:scale-110"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-[#ffff03]" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-[#27247b] hover:bg-[#27247b]/90 p-2 sm:p-3 rounded-full shadow-xl transition-all hover:scale-110"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-[#ffff03]" />
                      </button>
                      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-[#27247b]/90 backdrop-blur-sm text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg">
                        {selectedImageIndex + 1} / {imageUrls.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl sm:text-8xl mb-4 animate-pulse">
                      🌾
                    </div>
                    <p className="text-base sm:text-lg text-gray-600 font-medium">
                      No Images Available
                    </p>
                  </div>
                </div>
              )}
            </div>

            {imageUrls.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2 sm:gap-3">
                {imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                      selectedImageIndex === index
                        ? "border-[#ffff03] ring-4 ring-[#ffff03]/30 shadow-lg"
                        : "border-gray-200 hover:border-[#27247b]/30"
                    }`}
                  >
                    <Image
                      src={url || "/placeholder.svg"}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 25vw, 12vw"
                      quality={70}
                    />
                    {index === primaryImageIndex && (
                      <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 bg-[#ffff03] text-[#27247b] text-xs px-1.5 sm:px-2 py-0.5 rounded font-bold">
                        Primary
                      </div>
                    )}
                    {index === bundleImageIndex && (
                      <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 bg-blue-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-bold shadow-sm transform -rotate-3">
                        🥤 Bundle
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-linear-to-br from-white via-white to-[#ffff03]/5 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-5 border-2 border-[#ffff03]/20 hover:border-[#ffff03]/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-3 gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-linear-to-r from-[#27247b] via-[#1a1854] to-[#27247b] bg-clip-text text-transparent leading-tight mb-2 wrap-break-word flex flex-col sm:flex-row sm:items-center gap-2">
                    {product.name}
                    {isColdDrinkBundle && (
                      <span className="text-[10px] sm:text-xs bg-linear-to-r from-cyan-400 to-blue-500 text-white px-2.5 py-1 rounded-full font-black tracking-widest uppercase shadow-lg whitespace-nowrap mt-1 sm:mt-0 self-start animate-bounce">
                        + Free Cold Drink 🥤
                      </span>
                    )}
                  </h1>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1"></div>
                  </div>
                </div>
                {!product.name.toLowerCase().includes("bachat") &&
                  !product.name.toLowerCase().includes("mota") &&
                  !product.name.toLowerCase().includes("regular") && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs bg-linear-to-r from-amber-400 via-amber-300 to-yellow-300 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border border-amber-500/20 shrink-0 text-white font-bold whitespace-nowrap">
                      Premium
                    </div>
                  )}
              </div>

              {!product.available && (
                <div className="bg-linear-to-r from-red-100 to-red-50 border-2 border-red-400 text-red-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4 flex items-center shadow-md">
                  <span className="font-bold text-xs sm:text-sm">
                    ⚠️ Currently Out of Stock - Check Back Soon!
                  </span>
                </div>
              )}

              {product.description && (
                <div className="mt-3 p-2 sm:p-3 md:p-4 bg-linear-to-r from-[#27247b]/5 to-transparent rounded-lg border-l-4 border-[#ffff03]">
                  <h3 className="text-xs font-bold text-[#27247b] mb-2 uppercase tracking-wide">
                    About This Product
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-xs sm:text-sm md:text-base">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-linear-to-br from-white via-[#ffff03]/5 to-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 md:p-5 border-2 border-[#ffff03]/30 hover:border-[#ffff03]/60 transition-all duration-300">
              {/* Header Section */}
              <div className="mb-4">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold bg-linear-to-r from-[#27247b] to-[#1a1854] bg-clip-text text-transparent flex items-center gap-2">
                      <span className="text-lg sm:text-xl">💰</span>
                      <span className="wrap-break-word">
                        Choose Your Quantity
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Select bag sizes · Special bulk discounts available
                    </p>
                  </div>
                  {totalKg > 0 && (
                    <div className="bg-linear-to-r from-[#27247b] to-[#1a1854] text-white px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full font-bold text-xs sm:text-sm md:text-base shadow-lg animate-in slide-in-from-right duration-500 border-2 border-[#ffff03] shrink-0 whitespace-nowrap">
                      📦 {totalKg}kg
                    </div>
                  )}
                </div>

                {product.has_tier_pricing && (
                  <div className="flex flex-wrap gap-2 mb-1">
                    {product.tier_2_4kg_price && (
                      <div className="bg-white rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm border border-gray-200 text-xs">
                        <span className="text-gray-600">2-4kg:</span>
                        <span className="font-bold text-[#27247b] ml-1">
                          {formatCurrency(product.tier_2_4kg_price)}/kg
                        </span>
                      </div>
                    )}
                    {product.tier_5_9kg_price && (
                      <div className="bg-white rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm border border-gray-200 text-xs">
                        <span className="text-gray-600">5-9kg:</span>
                        <span className="font-bold text-[#27247b] ml-1">
                          {formatCurrency(product.tier_5_9kg_price)}/kg
                        </span>
                      </div>
                    )}
                    {product.tier_10kg_up_price && (
                      <div className="bg-linear-to-r from-[#ffff03] to-[#ffd700] rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-md border-2 border-[#ffff03] text-xs">
                        <span className="text-[#27247b] font-semibold">
                          10+kg:
                        </span>
                        <span className="font-bold text-[#27247b] ml-1">
                          {formatCurrency(product.tier_10kg_up_price)}/kg
                        </span>
                        <span className="text-[#27247b] ml-1">🎉</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Deal Announcement - replaces Ramadan Offer for bundles */}
              {isColdDrinkBundle && (
                <div className="mb-4 p-3 sm:p-5 rounded-xl border-2 border-cyan-400/50 bg-linear-to-r from-[#27247b] to-blue-800 text-white shadow-[0_8px_25px_rgba(39,36,123,0.3)] relative overflow-hidden group hover:scale-[1.02] transition-all duration-400">
                  <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                    <span className="text-8xl group-hover:animate-bounce inline-block transform rotate-12 -mt-4 -mr-4">
                      🥤
                    </span>
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <span className="text-4xl sm:text-5xl drop-shadow-lg animate-pulse delay-75">
                      🎁
                    </span>
                    <div>
                      <h3 className="font-black text-cyan-300 mb-1 text-base sm:text-lg tracking-widest uppercase drop-shadow">
                        Cold Drink Bundle
                      </h3>
                      <p className="text-xs sm:text-sm text-blue-50 font-medium leading-relaxed">
                        You get{" "}
                        <span className="text-[#27247b] font-black bg-linear-to-r from-cyan-300 to-cyan-400 px-2 py-0.5 rounded shadow-md mx-1 inline-block transform -rotate-1 scale-105">
                          1 FREE Cold Drink (1L)
                        </span>{" "}
                        for{" "}
                        <strong className="text-white border-b-2 border-cyan-300 pb-0.5 tracking-wide">
                          EVERY 10kg
                        </strong>{" "}
                        you buy!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ramadan Offer Banner */}
              {!isColdDrinkBundle &&
                process.env.NEXT_PUBLIC_ENABLE_RAMADAN_OFFER === "true" &&
                (() => {
                  // Calculate total weight from cart (cart already includes current product if added)
                  const cartWeight = cartItems.reduce(
                    (acc, item) => acc + item.quantity,
                    0,
                  );
                  const freeKg = Math.floor(cartWeight / 15);
                  const nextThreshold = (freeKg + 1) * 15;
                  const kgNeeded = nextThreshold - cartWeight;

                  return (
                    <div className="mb-4 p-3 sm:p-4 rounded-xl border-2 border-[#ffff03] bg-linear-to-r from-[#27247b] to-[#27247b]/90 text-white shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <span className="text-6xl">🌙</span>
                      </div>
                      <div className="relative z-10">
                        <h3 className="font-bold text-[#ffff03] flex items-center gap-2 mb-1 text-sm sm:text-base">
                          <span>⏳</span> Post-Eid Special (Ends April 25)
                        </h3>
                        {freeKg > 0 ? (
                          <p className="text-xs sm:text-sm">
                            🎉{" "}
                            <span className="font-bold text-[#ffff03]">
                              {freeKg}kg FREE Rice
                            </span>{" "}
                            qualified! Add{" "}
                            <span className="font-bold text-[#ffff03]">
                              {kgNeeded}kg
                            </span>{" "}
                            more for {freeKg + 1}kg free.
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm">
                            Add{" "}
                            <span className="font-bold text-[#ffff03]">
                              {kgNeeded}kg
                            </span>{" "}
                            more for 1kg FREE Rice!
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

              <div className="space-y-2 sm:space-y-3">
                {/* 3kg Bag */}
                {!isColdDrinkBundle &&
                  !product.name.toLowerCase().includes("every") && (
                    <div className="group flex items-center justify-between bg-linear-to-r from-white to-gray-50 p-2 sm:p-3 rounded-lg border-2 border-gray-200 hover:border-[#27247b] hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-linear-to-br from-[#27247b] to-[#1a1854] text-white w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0">
                          3kg
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#27247b] text-xs sm:text-sm md:text-base truncate">
                            3kg Bag
                          </p>
                          <p className="text-xs text-gray-600 font-medium">
                            {formatCurrency(getPricePerKg(product, 3))}/kg
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveBag(3)}
                          disabled={!product.available || bagCounts.kg3 === 0}
                          className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                        </Button>
                        <span className="w-5 sm:w-6 text-center font-bold text-[#27247b] text-sm">
                          {bagCounts.kg3}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddBag(3)}
                          disabled={!product.available}
                          className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 bg-[#ffff03] hover:bg-[#ffd700] border-2 border-[#ffff03] rounded-lg transition-all shadow-md"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-[#27247b]" />
                        </Button>
                      </div>
                    </div>
                  )}

                {/* 5kg Bag */}
                {!isColdDrinkBundle && (
                  <div className="group flex items-center justify-between bg-linear-to-r from-white to-gray-50 p-2 sm:p-3 rounded-lg border-2 border-gray-200 hover:border-[#27247b] hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="bg-linear-to-br from-[#27247b] to-[#1a1854] text-white w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0">
                        5kg
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#27247b] text-xs sm:text-sm md:text-base flex items-center gap-1 flex-wrap">
                          5kg Bag
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                            Popular
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 font-medium">
                          {formatCurrency(getPricePerKg(product, 5))}/kg
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveBag(5)}
                        disabled={!product.available || bagCounts.kg5 === 0}
                        className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                      </Button>
                      <span className="w-5 sm:w-6 text-center font-bold text-[#27247b] text-sm">
                        {bagCounts.kg5}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddBag(5)}
                        disabled={!product.available}
                        className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 bg-[#ffff03] hover:bg-[#ffd700] border-2 border-[#ffff03] rounded-lg transition-all shadow-md"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-[#27247b]" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 10kg Bag */}
                <div className="group flex items-center justify-between bg-linear-to-r from-white to-blue-50 p-2 sm:p-3 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="bg-linear-to-br from-[#27247b] to-[#1a1854] text-white w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0">
                      10kg
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#27247b] text-xs sm:text-sm md:text-base flex items-center gap-1 flex-wrap">
                        10kg Bag
                        {isColdDrinkBundle ? (
                          <span className="text-[10px] sm:text-xs bg-linear-to-r from-cyan-400 to-blue-500 text-white px-2 py-0.5 rounded-full font-black shadow-md whitespace-nowrap animate-pulse">
                            + 1L Cold Drink FREE 🥤
                          </span>
                        ) : (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                            Great Deal
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        {formatCurrency(getPricePerKg(product, 10))}/kg
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveBag(10)}
                      disabled={!product.available || bagCounts.kg10 === 0}
                      className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                    </Button>
                    <span className="w-5 sm:w-6 text-center font-bold text-[#27247b] text-sm">
                      {bagCounts.kg10}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddBag(10)}
                      disabled={!product.available}
                      className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 bg-[#ffff03] hover:bg-[#ffd700] border-2 border-[#ffff03] rounded-lg transition-all shadow-md"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-[#27247b]" />
                    </Button>
                  </div>
                </div>

                {/* 25kg Bag */}
                {!isColdDrinkBundle && (
                  <div className="group flex items-center justify-between bg-linear-to-r from-[#ffff03]/20 via-[#ffff03]/10 to-white p-2 sm:p-3 rounded-lg border-2 border-[#ffff03] hover:border-[#ffd700] hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-linear-to-l from-[#ffff03] to-transparent w-24 h-full opacity-20"></div>
                    <div className="flex items-center gap-2 min-w-0 relative z-10">
                      <div className="bg-linear-to-br from-[#27247b] via-[#1a1854] to-[#27247b] text-[#ffff03] w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg group-hover:scale-105 transition-transform duration-300 border-2 border-[#ffff03]/30 shrink-0">
                        25kg
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#27247b] text-xs sm:text-sm md:text-base flex items-center gap-1 flex-wrap">
                          25kg Bag
                          <span className="text-xs bg-linear-to-r from-[#ffff03] to-[#ffd700] text-[#27247b] px-2 py-0.5 rounded-full font-bold shadow-md">
                            ⭐ Best Value
                          </span>
                        </p>
                        <p className="text-xs text-gray-700 font-bold">
                          {formatCurrency(getPricePerKg(product, 25))}/kg
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 relative z-10 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveBag(25)}
                        disabled={!product.available || bagCounts.kg25 === 0}
                        className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                      </Button>
                      <span className="w-5 sm:w-6 text-center font-bold text-[#27247b] text-sm">
                        {bagCounts.kg25}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddBag(25)}
                        disabled={!product.available}
                        className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 bg-[#ffff03] hover:bg-[#ffd700] border-2 border-[#ffff03] rounded-lg transition-all shadow-lg"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-[#27247b] font-bold" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {totalKg > 0 && (
                <div className="mt-3 sm:mt-4 bg-linear-to-r from-[#27247b] to-[#1a1854] rounded-lg p-3 sm:p-4 shadow-lg overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Zap className="w-24 h-24 text-[#ffff03] -rotate-12 transform translate-x-8 -translate-y-8" />
                  </div>
                  <div className="flex items-center justify-between gap-4 relative z-10">
                    <div className="min-w-0">
                      <p className="text-white/80 text-xs sm:text-sm mb-1">
                        Total Amount
                      </p>
                      <div className="flex flex-col">
                        {totalKg * product.base_price_per_kg > totalPrice && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-red-300 line-through decoration-red-300/70 decoration-1">
                              {formatCurrency(
                                totalKg * product.base_price_per_kg,
                              )}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold bg-[#ffff03] text-[#27247b] px-1.5 py-0.5 rounded-full animate-pulse">
                              {Math.round(
                                ((totalKg * product.base_price_per_kg -
                                  totalPrice) /
                                  (totalKg * product.base_price_per_kg)) *
                                  100,
                              )}
                              % OFF
                            </span>
                          </div>
                        )}
                        <p className="text-xl sm:text-3xl font-bold text-[#ffff03] tracking-tight">
                          {formatCurrency(totalPrice)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white/80 text-xs sm:text-sm mb-1">
                        Price per kg
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-white">
                        {formatCurrency(pricePerKg)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {totalKg > 0 && (
              <div className="animate-in slide-in-from-bottom duration-500">
                <Button
                  size="lg"
                  className="w-full bg-linear-to-r from-[#27247b] to-[#1a1854] hover:from-[#1a1854] hover:to-[#27247b] text-white font-bold py-3 sm:py-4 md:py-5 text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 rounded-lg sm:rounded-xl border-2 border-[#ffff03]"
                  onClick={handleBuyNow}
                  disabled={!product.available}
                  onMouseEnter={() => setIsBuyNowHovered(true)}
                  onMouseLeave={() => setIsBuyNowHovered(false)}
                >
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-[#ffff03] animate-pulse" />
                  {isBuyNowHovered
                    ? "Go to Checkout"
                    : `Buy Now - ${formatCurrency(totalPrice)}`}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
