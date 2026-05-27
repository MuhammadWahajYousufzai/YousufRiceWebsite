"use cache";

import { SpecialDealCard } from "@/components/special-deal-card";
import { getCachedProducts, getCachedProductImages } from "@/lib/cached-data";
import { Package } from "lucide-react";

/**
 * Async component that fetches and displays special deals (hotel/restaurant products)
 * Wrapped in Suspense boundary for PPR optimization
 */
export async function AsyncSpecialDeals() {
  // Fetch all products and filter for hotel/restaurant products
  const allProducts = await getCachedProducts();
  const products = allProducts.filter((product) => {
    const searchText =
      `${product.name} ${product.description || ""}`.toLowerCase();
    return searchText.includes("hotel") || searchText.includes("restaurant");
  });

  const productIds = products.map((p) => p.$id);
  const images = await getCachedProductImages(productIds);
  const imageMap = new Map(images.map((img) => [img.product_id, img.file_id]));

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 md:py-24 px-6 bg-white rounded-3xl shadow-lg">
        <Package className="w-20 h-20 md:w-28 md:h-28 text-[#27247b]/20 mb-6" />
        <h2 className="text-3xl md:text-4xl font-bold text-[#27247b] mb-3 text-center">
          No Special Deals Available
        </h2>
        <p className="text-lg md:text-xl text-gray-600 text-center max-w-md">
          Check back soon for bulk deals!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Section Header */}
      <div className="text-center px-4">
        <div className="inline-block mb-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#27247b] mb-3">
            Special Deals for Hotels & Restaurants
          </h2>
          <div className="h-1.5 bg-[#ffff03] rounded-full"></div>
        </div>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Bulk quantities at special prices. Perfect for businesses and large
          orders.
        </p>
      </div>

      {/* Special Deals */}
      <div className="flex justify-center px-4 md:px-8">
        <div className="w-full max-w-5xl">
          {products.map((product) => (
            <SpecialDealCard
              key={product.$id}
              product={product}
              imageFileId={imageMap.get(product.$id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
