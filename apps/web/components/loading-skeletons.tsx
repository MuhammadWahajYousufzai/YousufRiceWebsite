/**
 * Loading Skeleton Components for PPR (Partial Prerendering)
 * These components provide instant visual feedback while dynamic content loads
 */

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100 animate-shimmer">
      <div className="p-6">
        {/* Image skeleton */}
        <div className="aspect-square bg-gray-200 rounded-xl mb-4"></div>

        {/* Title skeleton */}
        <div className="h-7 bg-gray-200 rounded-lg mb-3 w-3/4"></div>

        {/* Description skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>

        {/* Price tiers skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-16 bg-gray-200 rounded-lg"></div>
          <div className="h-16 bg-gray-200 rounded-lg"></div>
          <div className="h-16 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Button skeleton */}
        <div className="h-12 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
}

export function ProductsGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BannerSkeleton() {
  return (
    <div className="relative w-full h-50 sm:h-75 md:h-100 lg:h-125 bg-gray-200 animate-shimmer">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-400 rounded-full animate-spin"></div>
      </div>
    </div>
  );
}

export function HeroStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/20 animate-shimmer"
        >
          <div className="h-8 md:h-12 bg-white/20 rounded mb-2 w-16 mx-auto"></div>
          <div className="h-4 bg-white/20 rounded w-24 mx-auto"></div>
        </div>
      ))}
    </div>
  );
}

export function FeaturesSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="text-center p-4 md:p-6 lg:p-8 bg-white rounded-xl md:rounded-2xl shadow-md animate-shimmer"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-gray-200 rounded-xl md:rounded-2xl mx-auto mb-2 md:mb-4 lg:mb-5"></div>
          <div className="h-5 bg-gray-200 rounded mb-2 w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-full hidden md:block"></div>
        </div>
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 animate-shimmer">
          {/* Image gallery skeleton */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-200 rounded-2xl"></div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 rounded-lg"
                ></div>
              ))}
            </div>
          </div>

          {/* Product info skeleton */}
          <div className="space-y-6">
            <div className="h-10 bg-gray-200 rounded-lg w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdersListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-md p-6 animate-shimmer"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded-full w-24"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SpecialDealsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-lg overflow-hidden animate-shimmer"
        >
          <div className="aspect-video bg-gray-200"></div>
          <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="text-center mb-12 animate-shimmer">
      <div className="h-12 bg-gray-200 rounded-lg w-64 mx-auto mb-4"></div>
      <div className="h-6 bg-gray-200 rounded w-96 mx-auto"></div>
    </div>
  );
}
