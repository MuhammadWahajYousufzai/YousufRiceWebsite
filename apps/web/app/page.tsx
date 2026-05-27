import { Suspense } from "react";
import BannerWrapper from "@/components/BannerWithImages";
import { AsyncProductsList } from "@/components/async-products-list";
import {
  ProductsGridSkeleton,
  BannerSkeleton,
} from "@/components/loading-skeletons";
import PushNotificationButton from "@/components/PushNotificationButton";

export default function Home() {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
  const bucketId = process.env.NEXT_PUBLIC_BANNER_STORAGE_BUCKET_ID || "";

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Hero Banner - Suspense for dynamic images */}
      <Suspense fallback={<BannerSkeleton />}>
        {projectId && bucketId ? (
          <BannerWrapper projectId={projectId} bucketId={bucketId} />
        ) : (
          <BannerSkeleton />
        )}
      </Suspense>

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
