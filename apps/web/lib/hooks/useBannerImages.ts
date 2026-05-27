// hooks/useBannerImages.ts
import { useState, useEffect } from 'react';
import { Client, Storage } from 'appwrite';

interface UseBannerImagesProps {
  projectId: string;
  bucketId: string;
  endpoint?: string;
}

interface BannerImage {
  $id: string;
  name: string;
  url: string;
}

const useBannerImages = ({ 
  projectId, 
  bucketId, 
  endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
}: UseBannerImagesProps) => {
  const [images, setImages] = useState<BannerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBannerImages = async () => {
      try {
        setLoading(true);
        setError(null);

        const client = new Client()
          .setEndpoint(endpoint)
          .setProject(projectId);

        const storage = new Storage(client);
        const result = await storage.listFiles(bucketId);

        const bannerImages: BannerImage[] = result.files.map(file => ({
          $id: file.$id,
          name: file.name,
          url: `${endpoint}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${projectId}`
        }));

        setImages(bannerImages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch images');
        console.error('Error fetching banner images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBannerImages();
  }, [projectId, bucketId, endpoint]);

  return { images, loading, error };
};

export default useBannerImages;

// Usage example in a component:
/*
import Banner from './components/Banner';
import useBannerImages from './hooks/useBannerImages';

export default function HomePage() {
  const { images, loading, error } = useBannerImages({
    projectId: 'your-project-id',
    bucketId: 'banner'
  });

  if (loading) return <div className="w-full h-64 bg-gray-200 animate-pulse" />;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  const imageUrls = images.map(img => img.url);

  return (
    <div>
      <Banner images={imageUrls} />
    </div>
  );
}
*/