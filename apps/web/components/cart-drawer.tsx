"use client";

import { Drawer } from "@base-ui/react/drawer";
import { useCartStore } from "@/lib/store/cart-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Minus, ShoppingBag, X } from "lucide-react";
import {
  calculatePrice,
  formatCurrency,
  getPricePerKg,
  calculateSavings,
} from "@/lib/utils";
import { STORAGE_BUCKET_ID } from "@/lib/appwrite";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMetaTracking } from "@/lib/hooks/use-meta-tracking";
import { getEveryGrainShanGiftCount } from "@repo/utils";
import { everyGrainShanOfferEnabled } from "@/lib/feature-flags";

export function CartDrawer() {
  const {
    isOpen,
    setIsOpen,
    items,
    removeItem,
    addBag,
    removeBag,
    getTotalPrice,
    clearCart,
  } = useCartStore();
  const { trackInitiateCheckout } = useMetaTracking();
  const totalPrice = getTotalPrice();
  const router = useRouter();

  // Calculate total savings across all items
  const totalSavings = items.reduce((total, item) => {
    const savingsInfo = calculateSavings(item.product, item.quantity);
    return total + savingsInfo.savings;
  }, 0);

  const totalOriginalPrice = items.reduce((total, item) => {
    const savingsInfo = calculateSavings(item.product, item.quantity);
    return total + savingsInfo.originalPrice;
  }, 0);

  const handleCheckout = async () => {
    // Make tracking deterministic: stable item ordering + stable IDs
    const itemsForTracking = [...items].sort((a, b) =>
      a.product.$id.localeCompare(b.product.$id),
    );
    const uniqueContentIds = Array.from(
      new Set(itemsForTracking.map((item) => item.product.$id)),
    );

    await trackInitiateCheckout({
      value: totalPrice,
      currency: "PKR",
      numItems: itemsForTracking.reduce((sum, item) => sum + item.quantity, 0),
      contentIds: uniqueContentIds,
      stableKey: itemsForTracking
        .map((item) => `${item.product.$id}:${item.quantity}`)
        .join("|"),
    });

    setIsOpen(false);
    router.push("/checkout");
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen} swipeDirection="right">
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex justify-end">
          <Drawer.Popup className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 data-starting-style:translate-x-full data-ending-style:translate-x-full border-l border-neutral-200">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
              <Drawer.Title className="text-2xl font-bold tracking-tight text-[#27247b]">
                Your Cart
              </Drawer.Title>
              <Drawer.Close className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
                <span className="sr-only">Close cart</span>
              </Drawer.Close>
            </div>

            <Drawer.Content className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <ShoppingBag className="w-16 h-16 text-gray-300" />
                  <div className="space-y-1">
                    <Drawer.Description className="text-xl font-medium text-gray-900">
                      Your cart is empty
                    </Drawer.Description>
                    <p className="text-sm text-gray-500">
                      Looks like you haven&apos;t added anything yet.
                    </p>
                  </div>
                  <Button onClick={() => setIsOpen(false)} className="mt-4">
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Items List */}
                  <Drawer.Description className="sr-only">
                    Review your shopping cart items
                  </Drawer.Description>
                  <div className="space-y-4">
                    {items.map((item) => {
                      const pricePerKg = getPricePerKg(
                        item.product,
                        item.quantity,
                      );
                      const itemTotal = calculatePrice(
                        item.product,
                        item.quantity,
                      );
                      const savingsInfo = calculateSavings(
                        item.product,
                        item.quantity,
                      );
                      const shanGiftCount = everyGrainShanOfferEnabled
                        ? getEveryGrainShanGiftCount(item.product, item.bags)
                        : 0;

                      const imageUrl = item.product.primary_image_id
                        ? `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${item.product.primary_image_id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
                        : null;

                      return (
                        <Card
                          key={item.product.$id}
                          className="overflow-hidden border border-gray-100 shadow-sm"
                        >
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex gap-4">
                              <div className="relative w-20 h-20 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                                {imageUrl ? (
                                  <Image
                                    src={imageUrl}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                    quality={70}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                    <div className="text-2xl">🌾</div>
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <h3 className="text-sm font-semibold text-gray-900 truncate flex-1 leading-tight">
                                    {item.product.name}
                                    {shanGiftCount > 0 && (
                                      <span className="block mt-1 text-[10px] sm:text-xs bg-linear-to-r from-cyan-400 to-blue-500 text-white font-black px-1.5 py-0.5 rounded shadow-sm w-fit truncate">
                                        + {shanGiftCount}x FREE SHAN BIRYANI
                                        MASALA &amp; KHEER MIX 🎁
                                      </span>
                                    )}
                                  </h3>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeItem(
                                        item.product.$id,
                                        item.isColdDrinkBundle,
                                      )
                                    }
                                    className="h-8 w-8 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatCurrency(pricePerKg)}/kg • Total:{" "}
                                  {item.quantity}kg
                                </p>

                                {/* Bag Controls */}
                                <div className="space-y-1.5 mt-3">
                                  {([3, 5, 10, 25] as const).map((size) => {
                                    const count =
                                      item.bags[
                                        `kg${size}` as keyof typeof item.bags
                                      ];
                                    if (count > 0) {
                                      return (
                                        <div
                                          key={size}
                                          className="flex items-center justify-between bg-white border border-gray-100 rounded-md px-2 py-1 shadow-xs"
                                        >
                                          <span className="text-[11px] font-medium text-gray-600">
                                            {size}kg bags: {count}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                removeBag(
                                                  item.product.$id,
                                                  size,
                                                  item.isColdDrinkBundle,
                                                )
                                              }
                                              className="h-5 w-5 p-0 bg-gray-50 hover:bg-red-50 hover:text-red-600 border border-gray-200 rounded"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() =>
                                                addBag(
                                                  item.product,
                                                  size,
                                                  item.isColdDrinkBundle,
                                                )
                                              }
                                              className="h-5 w-5 p-0 bg-gray-50 hover:bg-[#ffff03]/20 hover:text-[#27247b] border border-gray-200 rounded"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>

                                <div className="mt-3 flex items-end justify-between">
                                  <p className="font-bold text-[#27247b]">
                                    {formatCurrency(itemTotal)}
                                  </p>
                                  {savingsInfo.savings > 0 && (
                                    <p className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                      Saved{" "}
                                      {formatCurrency(savingsInfo.savings)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </Drawer.Content>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 bg-white p-4 sm:p-6 pb-safe">
                <div className="space-y-3 mb-4">
                  {totalSavings > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Retail Value</span>
                      <span className="text-gray-400 line-through">
                        {formatCurrency(totalOriginalPrice)}
                      </span>
                    </div>
                  )}
                  {totalSavings > 0 && (
                    <div className="flex justify-between items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-1.5 rounded-lg border border-green-100">
                      <span>Total Savings</span>
                      <span>-{formatCurrency(totalSavings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end pt-2 border-t border-gray-100">
                    <span className="text-base font-semibold text-gray-900">
                      Total
                    </span>
                    <span className="text-2xl font-black text-[#27247b]">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={clearCart}
                  >
                    Clear
                  </Button>
                  <Button
                    className="flex-2 bg-[#27247b] hover:bg-[#1a1854] text-white shadow-xl hover:shadow-2xl transition-all"
                    size="lg"
                    onClick={handleCheckout}
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            )}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
