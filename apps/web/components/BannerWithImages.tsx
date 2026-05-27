"use cache";

import Banner from "@/components/Banner";
import { getBannerImages } from "@/lib/banner-cache";

interface BannerWrapperProps {
  projectId: string;
  bucketId: string;
}

const BannerWrapper = async ({ projectId, bucketId }: BannerWrapperProps) => {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;

  // Fetch cached banner images
  const images = await getBannerImages(bucketId, projectId, endpoint);

  // No images state
  if (images.length === 0) {
    return (
      <div className="w-full h-64 md:h-96 lg:h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">No banner images found</div>
      </div>
    );
  }

  // Extract URLs from the images
  const imageUrls = images.map((img) => img.url);

  return <Banner images={imageUrls} />;
};

export default BannerWrapper;
