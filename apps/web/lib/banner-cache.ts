import { storage } from "./appwrite";

interface BannerImage {
  $id: string;
  name: string;
  url: string;
}

export const getBannerImages = async (
  bucketId: string,
  projectId: string,
  endpoint: string,
) => {
  // Validate required parameters
  if (!bucketId || !projectId || !endpoint) {
    console.error("Error fetching banner images: Missing required parameters", {
      bucketId: !!bucketId,
      projectId: !!projectId,
      endpoint: !!endpoint,
    });
    return [];
  }

  try {
    const result = await storage.listFiles(bucketId);

    const bannerImages: BannerImage[] = result.files.map((file) => ({
      $id: file.$id,
      name: file.name,
      url: `${endpoint}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${projectId}`,
    }));

    return bannerImages;
  } catch (error) {
    console.error("Error fetching banner images:", error);
    return [];
  }
};
