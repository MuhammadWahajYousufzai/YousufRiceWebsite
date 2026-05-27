import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../lib/appwrite-server';

/**
 * Admin route proxy for server-side authentication
 * Runs on Node.js runtime (Next.js 16+)
 */
export async function proxy(request: NextRequest) {
  try {
    // Create server-side Appwrite client
    const { account } = createClient();
    
    try {
      // Get current user
      const user = await account.get();
      
      // Check for admin labels
      const hasAdminLabel = user.labels?.includes('admin');
      const hasReadOnlyLabel = user.labels?.includes('readonly');
      
      // If user has either admin or readonly label, allow access to all admin routes
      if (hasAdminLabel || hasReadOnlyLabel) {
        return NextResponse.next();
      }
      
      // No admin permissions, redirect to unauthorized page
      return NextResponse.redirect(new URL('/', request.url));
    } catch (error) {
      console.error('Admin auth proxy error:', error);
      // Authentication error, redirect to login
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  } catch (error) {
    console.error('Proxy initialization error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}

// Apply proxy only to admin routes
export const config = {
  matcher: [
    // Match all paths within the admin route group
    '/(admin)/:path*',
  ],
};
