import { Suspense } from 'react';
import { Metadata } from 'next';
import { getCachedProduct, getCachedProductImagesById } from '@/lib/cached-data';
import { storage, STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { ProductDetailSkeleton } from '@/components/loading-skeletons';
import ProductDetailClient from './product-detail-client';
import { notFound } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Product Detail Page with Partial Prerendering (PPR)
 * 
 * Static Shell:
 * - Page structure and layout
 * - Navigation and footer (from layout)
 * 
 * Dynamic Content (Suspense boundaries):
 * - Product details (streamed)
 * - Product images (streamed)
 * 
 * Benefits:
 * - Instant static shell (<100ms)
 * - Progressive content streaming
 * - Optimal SEO with immediate content
 * - Better UX with loading states
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getCachedProduct(id);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const images = await getCachedProductImagesById(id);
  const primaryImage = images.find((img) => img.is_primary) || images[0];

  const imageUrl = primaryImage
    ? `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${primaryImage.file_id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
    : undefined;

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}
export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailContent productId={id} />
      </Suspense>
    </div>
  );
}

/**
 * Async component that fetches and displays product details
 * Wrapped in Suspense boundary for PPR optimization
 */
async function ProductDetailContent({ productId }: { productId: string }) {
  // Fetch product and images using cached data functions
  const [product, images] = await Promise.all([
    getCachedProduct(productId),
    getCachedProductImagesById(productId),
  ]);

  // Handle product not found
  if (!product) {
    notFound();
  }

  // Generate image URLs directly using string interpolation
  const imageUrls = images.map((img) =>
    `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${img.file_id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
  );

  // Find the primary and bundle image indices
  const primaryImageIndex = images.findIndex((img) => img.is_primary);
  const bundleImageIndex = images.findIndex((img) => img.is_cold_drink_bundle);

  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailClient
        product={product}
        imageUrls={imageUrls}
        primaryImageIndex={primaryImageIndex >= 0 ? primaryImageIndex : 0}
        bundleImageIndex={bundleImageIndex >= 0 ? bundleImageIndex : undefined}
      />
    </Suspense>
  );
}
