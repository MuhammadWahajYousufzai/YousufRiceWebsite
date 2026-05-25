"use cache";

import { ProductCard } from "@/components/product-card";
import { ColdDrinkBundleCard } from "@/components/cold-drink-bundle-card";
import {
  getCachedRegularProducts,
  getCachedProductImages,
} from "@/lib/cached-data";
import { Package } from "lucide-react";

/**
 * Async component that fetches and displays products
 * Wrapped in Suspense boundary for PPR optimization
 */
export async function AsyncProductsList() {
  // Fetch products using cached data functions
  const allProducts = await getCachedRegularProducts();
  const products = allProducts.filter((p) => p.available);

  const EXCLUDED_COLD_DRINK_IDS = new Set([
    "6916cb0a0021c185b7e9",
    "6916cbbe0016c5a0e97a",
    "6916cbef001ae8761e0c",
  ]);

  // Custom sort order: Every Grain -> All Steam -> All Sella -> Bachat Basmati -> Bachat Regular
  const sortedProducts = products.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Define priority groups
    const getPriority = (name: string) => {
      if (name.includes("every grain")) return 1;
      if (name.includes("steam")) return 2;
      if (name.includes("sella")) return 3;
      if (name.includes("bachat") && name.includes("basmati")) return 4;
      if (name.includes("bachat")) return 5;
      return 6;
    };

    const aPriority = getPriority(aName);
    const bPriority = getPriority(bName);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Sub-sort for Steam products
    if (aPriority === 2 && bPriority === 2) {
      const getSteamPriority = (name: string) => {
        if (name.includes("x-steam") || name.includes("x steam")) return 1;
        if (name.includes("platinum")) return 2;
        if (name.includes("premium")) return 3;
        return 4;
      };
      return getSteamPriority(aName) - getSteamPriority(bName);
    }

    // Sub-sort for Sella products
    if (aPriority === 3 && bPriority === 3) {
      const getSellaPriority = (name: string) => {
        if (name.includes("ultimate")) return 1;
        if (name.includes("platinum")) return 2;
        if (name.includes("gold")) return 3;
        return 4;
      };
      return getSellaPriority(aName) - getSellaPriority(bName);
    }

    return 0;
  });

  const productIds = sortedProducts.map((p) => p.$id);
  const images = await getCachedProductImages(productIds);
  // Map primary images for regular product cards
  const imageMap = new Map(
    images
      .filter((img) => img.is_primary)
      .map((img) => [img.product_id, img.file_id]),
  );

  // Map cold drink bundle images specifically for the bundle cards
  const bundleImageMap = new Map(
    images
      .filter((img) => img.is_cold_drink_bundle)
      .map((img) => [img.product_id, img.file_id]),
  );

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
        <Package className="w-32 h-32 text-[#27247b]/20 mx-auto mb-6" />
        <h2 className="text-4xl font-bold text-[#27247b] mb-4">
          No Products Available
        </h2>
        <p className="text-xl text-gray-600">
          Check back soon for our premium rice selection!
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Section Header */}
      <div className="text-center mb-12">
        <div className="inline-block">
          <h2 className="text-4xl md:text-5xl font-bold text-[#27247b] mb-4">
            Our Products
          </h2>
          <div className="h-1.5 bg-[#ffff03] rounded-full"></div>
        </div>
        <p className="text-xl text-gray-600 mt-6 max-w-2xl mx-auto">
          Choose your preferred quantity for the best pricing. All products come
          with our quality guarantee.
        </p>
      </div>

      {/* Free Cold Drink Bundles Section */}
      {process.env.NEXT_PUBLIC_ENABLE_COLD_DRINK_BUNDLE === "true" && (
        <div className="mb-16 w-full">
          <div className="mb-8 mt-8">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-0.5 bg-linear-to-r from-transparent via-blue-500 to-blue-500"></div>
              <h3 className="text-2xl md:text-3xl font-black text-blue-600 whitespace-nowrap flex items-center gap-2">
                <span className="text-3xl">🥤</span> Exclusive Free Cold Drink
                Deals
              </h3>
              <div className="flex-1 h-0.5 bg-linear-to-l from-transparent via-blue-500 to-blue-500"></div>
            </div>
          </div>

          <div className="flex justify-center w-full">
            <div className="grid gap-6 justify-center grid-cols-[repeat(auto-fit,minmax(250px,1fr))] max-w-5xl w-full">
              {sortedProducts
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes("ultimate sella") ||
                    p.name.toLowerCase().includes("x-steam") ||
                    p.name.toLowerCase().includes("x steam"),
                )
                .map((product) => (
                  <div
                    key={`bundle-${product.$id}`}
                    className="flex justify-center"
                  >
                    <div className="w-full max-w-sm">
                      <ColdDrinkBundleCard
                        product={product}
                        imageFileId={
                          bundleImageMap.get(product.$id) ||
                          imageMap.get(product.$id)
                        }
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid with Category Headings */}
      <div className="mb-16 w-full">
        {/* Group products by category */}
        {(() => {
          const categories: { [key: string]: typeof sortedProducts } = {};
          const categoryOrder: string[] = [];

          sortedProducts.forEach((product) => {
            const productName = product.name.toLowerCase();
            let category = "Other";

            if (productName.includes("every grain")) {
              category = "Every Grain Rice XXXL";
            } else if (productName.includes("steam")) {
              category = "Basmati Steam Rice";
            } else if (productName.includes("sella")) {
              category = "Sella Rice";
            }
            if (
              productName.includes("bachat") ||
              productName.includes("regular")
            ) {
              category = "Bachat Rice";
            }

            if (!categories[category]) {
              categories[category] = [];
              categoryOrder.push(category);
            }
            categories[category].push(product);
          });

          return categoryOrder.map((category) => (
            <div key={category} className="mb-16">
              {/* Category Heading */}
              <div className="mb-8 mt-8">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-0.5 bg-linear-to-r from-transparent via-[#ffff03] to-[#ffff03]"></div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#27247b] whitespace-nowrap">
                    {category}
                  </h3>
                  <div className="flex-1 h-0.5 bg-linear-to-l from-transparent via-[#ffff03] to-[#ffff03]"></div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="flex justify-center w-full">
                <div
                  className="
      grid 
      gap-6 
      justify-center 
      grid-cols-[repeat(auto-fit,minmax(250px,1fr))]
      max-w-5xl
      w-full
    "
                >
                  {categories[category].map((product) => (
                    <div key={product.$id} className="flex justify-center">
                      <div className="w-full max-w-sm">
                        <ProductCard
                          product={product}
                          imageFileId={imageMap.get(product.$id)}
                          badgeLabel={
                            EXCLUDED_COLD_DRINK_IDS.has(product.$id)
                              ? undefined
                              : "Free Cold Drink"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ));
        })()}
      </div>
    </>
  );
}
