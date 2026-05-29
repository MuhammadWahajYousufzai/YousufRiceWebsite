"use cache";

import { ProductCard } from "@/components/product-card";
import { ColdDrinkBundleCard } from "@/components/cold-drink-bundle-card";
import {
  getCachedRegularProducts,
  getCachedProductImages,
} from "@/lib/cached-data";
import {
  groupProductsByCatalogCategory,
  isColdDrinkBundleProduct,
  shouldShowColdDrinkBadge,
  sortProductsForCatalog,
} from "@repo/utils";
import { Package } from "lucide-react";

/**
 * Async component that fetches and displays products
 * Wrapped in Suspense boundary for PPR optimization
 */
export async function AsyncProductsList() {
  // Fetch products using cached data functions
  const allProducts = await getCachedRegularProducts();
  const products = allProducts.filter((p) => p.available);

  const sortedProducts = sortProductsForCatalog(products);

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
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="flex-1 h-0.5 bg-linear-to-r from-transparent via-blue-500 to-blue-500"></div>
              <h3 className="min-w-0 max-w-[min(100%,42rem)] text-center text-xl sm:text-2xl md:text-3xl font-black text-blue-600 leading-tight flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <span className="text-2xl sm:text-3xl">🥤</span> Cold Drink Bundles
              </h3>
              <div className="flex-1 h-0.5 bg-linear-to-l from-transparent via-blue-500 to-blue-500"></div>
            </div>
          </div>

          <div className="flex justify-center w-full">
            <div className="grid gap-6 justify-center grid-cols-[repeat(auto-fit,minmax(250px,1fr))] max-w-5xl w-full">
              {sortedProducts
                .filter(isColdDrinkBundleProduct)
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
          return groupProductsByCatalogCategory(sortedProducts).map(({ category, products: categoryProducts }) => (
            <div key={category} className="mb-16">
              {/* Category Heading */}
              <div className="mb-8 mt-8">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="flex-1 h-0.5 bg-linear-to-r from-transparent via-[#ffff03] to-[#ffff03]"></div>
                  <h3 className="min-w-0 max-w-full text-center text-2xl md:text-3xl font-bold text-[#27247b] leading-tight">
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
                  {categoryProducts.map((product) => (
                    <div key={product.$id} className="flex justify-center">
                      <div className="w-full max-w-sm">
                        <ProductCard
                          product={product}
                          imageFileId={imageMap.get(product.$id)}
                          badgeLabel={
                            shouldShowColdDrinkBadge(product)
                              ? "Free Cold Drink"
                              : undefined
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
