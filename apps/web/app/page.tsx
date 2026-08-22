import { Suspense } from "react";
import { AsyncProductsList } from "@/components/async-products-list";
import { ProductsGridSkeleton } from "@/components/loading-skeletons";
import PushNotificationButton from "@/components/PushNotificationButton";
import StorefrontPromotions from "@/components/storefront-promotions";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <StorefrontPromotions />

      {/* Products Section - Suspense for dynamic product data */}
      <section
        id="products"
        className="container mx-auto px-4 py-16 scroll-mt-28"
      >
        <Suspense fallback={<ProductsGridSkeleton />}>
          <AsyncProductsList />
        </Suspense>
      </section>

      {/* Push Notification Subscribe CTA */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex justify-center">
          <PushNotificationButton />
        </div>
      </section>
    </div>
  );
}
