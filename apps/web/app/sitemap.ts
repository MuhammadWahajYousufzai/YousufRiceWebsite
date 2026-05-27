import { MetadataRoute } from 'next';
import { tablesDB, PRODUCTS_TABLE_ID, DATABASE_ID } from "@/lib/appwrite";
import { Product } from '@/lib/types';
import { Query } from 'appwrite';

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use primary domain for sitemap
  const baseUrl = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'https://yourdomain.com';

  // Fetch all available products
  let products: Product[] = [];
  
  // Only fetch products if we have valid database configuration
  // This prevents build errors when database isn't accessible during build time
  if (DATABASE_ID && PRODUCTS_TABLE_ID && DATABASE_ID !== 'undefined' && PRODUCTS_TABLE_ID !== 'undefined') {
    try {
      const response = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID, queries: [Query.equal('available', true)] });
      products = response.rows as unknown as Product[];
    } catch (error) {
      console.error('Error fetching products for sitemap:', error);
      // Return empty products array to allow build to continue
    }
  } else {
    console.warn('Sitemap: Database configuration not available, skipping product pages');
  }

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/special-deals`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/track-order`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ];

  // Product pages (if you have individual product pages)
  const productPages = products.map((product) => ({
    url: `${baseUrl}/products/${product.$id}`,
    lastModified: new Date(product.$createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [...staticPages, ...productPages];
}
