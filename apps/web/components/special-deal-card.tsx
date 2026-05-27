"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Minus,
  Package,
  Sparkles,
  Zap,
  ArrowRight,
  TrendingDown,
  Award,
  Check,
} from "lucide-react";
import { Product } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useCartStore } from "@/lib/store/cart-store";
import { calculatePrice, formatCurrency, getPricePerKg } from "@/lib/utils";
import { storage, STORAGE_BUCKET_ID } from "@/lib/appwrite";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useMetaTracking } from "@/lib/hooks/use-meta-tracking";

interface SpecialDealCardProps {
  product: Product;
  imageFileId?: string;
}

export function SpecialDealCard({
  product,
  imageFileId,
}: SpecialDealCardProps) {
  const [bagCount, setBagCount] = useState(0);
  const addBag = useCartStore((state) => state.addBag);
  const removeBag = useCartStore((state) => state.removeBag);
  const router = useRouter();
  const { trackAddToCart } = useMetaTracking();

  const totalKg = bagCount * 25;
  const pricePerKg = getPricePerKg(product, totalKg || 25);
  const totalPrice = calculatePrice(product, totalKg || 0);

  const imageUrl = imageFileId
    ? `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${imageFileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
    : null;

  const handleAddBag = () => {
    const newBagCount = bagCount + 1;
    const newTotalKg = newBagCount * 25;
    const newTotalPrice = calculatePrice(product, newTotalKg);

    trackAddToCart({
      contentName: product.name,
      contentId: product.$id,
      value: newTotalPrice,
      currency: "PKR",
      quantity: newTotalKg,
    });

    setBagCount((prev) => prev + 1);
    addBag(product, 25);
    useCartStore.getState().setIsOpen(true);
    useCartStore.getState().highlightCart();
    toast.success(`Added 25kg bag of ${product.name} to cart!`, {
      icon: "🎉",
      style: {
        borderRadius: "12px",
        background: "#27247b",
        color: "#ffff03",
        fontWeight: "bold",
      },
    });
  };

  const handleRemoveBag = () => {
    if (bagCount > 0) {
      setBagCount((prev) => prev - 1);
      removeBag(product.$id, 25);
      toast.success(`Removed 25kg bag from cart!`);
    }
  };

  const handleBuyNow = () => {
    if (bagCount === 0) {
      toast.error("Please add at least one 25kg bag to continue!");
      return;
    }

    useCartStore.getState().setIsOpen(true);
    useCartStore.getState().highlightCart();

    toast.success("Review cart! Proceeding to checkout shortly...", {
      icon: "🚀",
      style: {
        borderRadius: "12px",
        background: "#27247b",
        color: "#ffff03",
        fontWeight: "bold",
      },
    });

    setTimeout(() => {
      useCartStore.getState().setIsOpen(false);
      useCartStore.getState().highlightCart();
      router.push("/checkout");
    }, 150);
  };

  return (
    <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 border-none bg-white shadow-xl rounded-3xl group">
      {/* Hero Section: Image */}
      <div className="relative bg-linear-to-br from-[#fafafa] via-white to-[#ffff03]/5 overflow-hidden">
        {/* Premium Badge */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 bg-linear-to-r from-[#ffff03] via-[#ffed4e] to-[#e6e600] text-[#27247b] px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-xs md:text-sm shadow-2xl flex items-center gap-2">
          <Award className="w-4 h-4 md:w-5 md:h-5" />
          <span>Bulk Deal</span>
        </div>

        {/* Image Container */}
        <div className="h-100 md:h-125 lg:h-137.5 relative flex items-center justify-center p-8 md:p-12 pb-20 md:pb-24">
          {imageUrl ? (
            <div className="relative w-full h-full">
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-contain group-hover:scale-105 transition-transform duration-700 drop-shadow-2xl"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={85}
              />
            </div>
          ) : (
            <div className="text-center">
              <Package className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 text-[#27247b]/20" />
              <p className="text-lg md:text-xl text-gray-600 font-medium">
                Premium Rice Product
              </p>
            </div>
          )}

          {!product.available && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold text-2xl md:text-3xl bg-red-600 px-8 py-4 md:px-10 md:py-5 rounded-full shadow-2xl">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* View Details Button */}
        <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
          <Link href={`/products/${product.$id}`}>
            <Button className="w-full h-12 md:h-14 lg:h-16 bg-[#27247b] hover:bg-[#1a1854] text-white font-bold text-sm md:text-base lg:text-lg shadow-2xl hover:shadow-[#ffff03]/30 transition-all duration-300 hover:scale-[1.02] rounded-xl border-2 border-[#ffff03] group/btn">
              <span>View Full Details</span>
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2 text-[#ffff03] group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-5 md:p-6 lg:p-8">
        {/* Product Header */}
        <div className="mb-5 md:mb-6">
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#27247b] mb-2 md:mb-3 leading-tight">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm md:text-base lg:text-lg text-gray-600 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-4 md:gap-5 mb-5 md:mb-6 lg:grid-cols-2">
          {/* Main Price Card */}
          <div className="bg-linear-to-br from-[#27247b] via-[#2d2a85] to-[#1a1854] rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#ffff03] rounded-full blur-3xl opacity-20"></div>
            <div className="relative">
              <p className="text-xs text-white/60 mb-1 font-semibold uppercase tracking-wider">
                Bulk Price
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#ffff03]">
                  {formatCurrency(pricePerKg * 25)}
                </p>
                <span className="text-white/80 text-sm md:text-base font-medium">
                  /bag
                </span>
              </div>
              <p className="text-white/70 text-xs md:text-sm font-medium">
                {formatCurrency(pricePerKg)}/kg × 25kg per bag
              </p>

              {product.has_tier_pricing &&
                product.base_price_per_kg > pricePerKg && (
                  <div className="mt-3 md:mt-4 inline-flex items-center gap-1.5 bg-[#ffff03] text-[#27247b] px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm shadow-lg">
                    <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>
                      Save{" "}
                      {formatCurrency(
                        (product.base_price_per_kg - pricePerKg) * 25,
                      )}
                    </span>
                  </div>
                )}
            </div>
          </div>

          {/* Volume Discounts */}
          {product.has_tier_pricing && (
            <div className="bg-linear-to-br from-[#ffff03]/10 via-[#ffff03]/5 to-transparent rounded-2xl p-5 md:p-6 border-2 border-[#ffff03]/30 shadow-lg">
              <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-4">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-linear-to-br from-[#27247b] to-[#1a1854] rounded-lg flex items-center justify-center shadow-lg shrink-0">
                  <span className="text-lg md:text-xl">💰</span>
                </div>
                <div>
                  <p className="text-sm md:text-base font-bold text-[#27247b]">
                    Volume Discounts
                  </p>
                  <p className="text-xs text-gray-600">Buy more, save more</p>
                </div>
              </div>
              <div className="space-y-2">
                {product.tier_2_4kg_price && (
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm font-semibold text-gray-600">
                        50-100kg
                      </span>
                      <span className="text-sm md:text-base font-bold text-[#27247b]">
                        {formatCurrency(product.tier_2_4kg_price)}/kg
                      </span>
                    </div>
                  </div>
                )}
                {product.tier_5_9kg_price && (
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm font-semibold text-gray-600">
                        125-225kg
                      </span>
                      <span className="text-sm md:text-base font-bold text-[#27247b]">
                        {formatCurrency(product.tier_5_9kg_price)}/kg
                      </span>
                    </div>
                  </div>
                )}
                {product.tier_10kg_up_price && (
                  <div className="bg-linear-to-br from-[#ffff03] to-[#e6e600] rounded-lg p-3 shadow-lg border-2 border-[#ffff03]/50 hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm font-semibold text-[#27247b]/80 flex items-center gap-1">
                        250kg+ <Check className="w-3 h-3" />
                      </span>
                      <span className="text-sm md:text-base font-bold text-[#27247b]">
                        {formatCurrency(product.tier_10kg_up_price)}/kg
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quantity Selector - Modern Design */}
        <div className="bg-linear-to-br from-white to-gray-50 rounded-2xl p-4 md:p-5 border-2 border-gray-200 shadow-sm mb-5 md:mb-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Bag Size</p>
              <div className="flex items-center gap-2">
                <div className="bg-[#27247b] text-[#ffff03] rounded-lg px-3 py-1.5 md:px-4 md:py-2 font-bold text-sm md:text-base shadow-md">
                  25kg
                </div>
                <span className="text-gray-600 text-xs md:text-sm">
                  per bag
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-medium mb-1">Selected</p>
              <p className="text-3xl md:text-4xl font-bold text-[#27247b]">
                {bagCount}
              </p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-2 gap-2.5 md:gap-3">
            <Button
              onClick={handleRemoveBag}
              disabled={!product.available || bagCount === 0}
              className="h-12 md:h-14 rounded-xl bg-white border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
              style={{
                borderColor: bagCount === 0 ? "#e5e7eb" : "#ef4444",
                color: bagCount === 0 ? "#9ca3af" : "#ef4444",
                backgroundColor: bagCount === 0 ? "#f9fafb" : "white",
              }}
            >
              <Minus className="w-5 h-5 md:w-6 md:h-6" />
              <span className="ml-2 font-bold text-sm md:text-base">
                Remove
              </span>
            </Button>
            <Button
              onClick={handleAddBag}
              disabled={!product.available}
              className="h-12 md:h-14 rounded-xl bg-linear-to-r from-[#ffff03] via-[#ffed4e] to-[#e6e600] hover:from-[#e6e600] hover:to-[#ffff03] text-[#27247b] font-bold text-sm md:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 border-2 border-[#ffff03]"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6" />
              <span className="ml-2">Add Bag</span>
            </Button>
          </div>
        </div>

        {/* Order Summary - Shows when bags added */}
        {bagCount > 0 && (
          <div className="space-y-3 md:space-y-4 animate-in slide-in-from-bottom duration-300">
            {/* Total Card */}
            <div className="bg-linear-to-br from-[#ffff03]/10 via-white to-[#ffff03]/5 rounded-2xl p-4 sm:p-5 md:p-6 border-2 border-[#ffff03] shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-xs text-gray-600 font-semibold mb-1 uppercase tracking-wider">
                    Weight
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#27247b]">
                    {totalKg}kg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs text-gray-600 font-semibold mb-1 uppercase tracking-wider">
                    Total
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#27247b]">
                    {formatCurrency(totalPrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
              <Button
                onClick={handleBuyNow}
                disabled={!product.available}
                className="h-14 md:h-16 lg:h-18 bg-linear-to-r from-[#27247b] via-[#2d2a85] to-[#1a1854] hover:from-[#1a1854] hover:to-[#27247b] text-white font-bold text-base md:text-lg rounded-xl shadow-2xl hover:shadow-[#ffff03]/50 transition-all duration-300 hover:scale-[1.02] border-2 border-[#ffff03] order-2 sm:order-1"
              >
                <Zap className="w-5 h-5 md:w-6 md:h-6 mr-2 text-[#ffff03]" />
                Buy Now
              </Button>

              <Button
                variant="outline"
                className="order-1 sm:order-2 w-full h-14 md:h-16 lg:h-18 border-2 border-[#27247b] text-[#27247b] hover:bg-[#27247b] hover:text-white hover:border-[#27247b] font-bold text-base md:text-lg rounded-xl transition-all hover:scale-[1.02]"
                onClick={() => useCartStore.getState().setIsOpen(true)}
              >
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                Cart ({bagCount})
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
