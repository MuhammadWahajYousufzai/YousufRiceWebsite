'use server';

import { updateTag } from 'next/cache';
import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Server Action to immediately clear ALL site-wide caches
 * Uses updateTag for immediate cache invalidation (read-your-own-writes)
 * This ensures the admin sees fresh data immediately after clearing cache
 */
export async function clearImageCache() {
  try {
    // Immediately expire all caches site-wide
    // updateTag provides immediate cache clearing (no stale-while-revalidate)
    updateTag('product-images');
    updateTag('products');
    updateTag('banner-images');
    updateTag('orders');
    updateTag('customers');
    updateTag('addresses');
    
    // Revalidate ALL paths to ensure complete site-wide cache refresh
    revalidatePath('/', 'layout'); // This clears the entire site layout cache
    
    // Attempt to physically delete the Next.js image cache directory
    try {
      const imageCacheDir = path.join(process.cwd(), '.next', 'cache', 'images');
      await fs.rm(imageCacheDir, { recursive: true, force: true });
      console.log('Successfully deleted physical image cache directory:', imageCacheDir);
    } catch (e) {
      console.warn('Could not delete physical image cache directory. It may not exist or is locked:', e);
    }

    return {
      success: true,
      message: 'All site cache cleared successfully! The entire site will reload with fresh data.',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return {
      success: false,
      error: 'Failed to clear site cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
