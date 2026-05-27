import { NextRequest, NextResponse } from 'next/server';
import { Client, Account } from 'appwrite';

// Detect if we're in a build environment
const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';
};

/**
 * Create a server-side Appwrite client with session from request cookies
 * @param req - Next.js request object
 */
function createServerClient(req: NextRequest) {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const authorization = req.headers.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : undefined;

  // The Appwrite session cookie lives on the Appwrite domain (yousufricemill.com),
  // so the browser won't send it to our local API routes (localhost:3000).
  // Instead we sync the session secret into a 'yousuf_session' cookie on
  // the Next.js domain after login, so it is forwarded automatically.
  const session = req.cookies.get('yousuf_session')?.value;

  if (bearerToken) {
    client.setJWT(bearerToken);
  } else if (session) {
    client.setSession(session);
  }

  return { client, account: new Account(client) };
}

/**
 * Utility function to check admin permissions for API routes
 * @param req - Next.js request object
 * @param requireWriteAccess - Whether write access is required (admin label)
 * @param requireAdminOnly - Whether only admin label is allowed (not readonly)
 * @returns NextResponse error or null if authorized
 */
export async function checkAdminPermissions(
  req: NextRequest,
  requireWriteAccess = false,
  requireAdminOnly = false
): Promise<NextResponse | null> {
  // Skip authentication during build time
  if (isBuildTime()) {
    console.log('Build-time auth check, skipping');
    return null;
  }
  
  try {
    // Create server client with session from cookies
    const { account } = createServerClient(req);
    const user = await account.get();
    
    const hasAdminLabel = user.labels?.includes('admin');
    const hasReadOnlyLabel = user.labels?.includes('readonly');
    
    // For admin-only access (notifications, etc.), require admin label
    if (requireAdminOnly && !hasAdminLabel) {
      return NextResponse.json(
        { 
          error: 'Admin access required',
          message: 'This feature is only available to administrators'
        },
        { status: 403 }
      );
    }
    
    // For write operations, require admin label
    if (requireWriteAccess && !hasAdminLabel) {
      return NextResponse.json(
        { 
          error: 'Write access denied',
          message: 'You have read-only access and cannot perform this action'
        },
        { status: 403 }
      );
    }
    
    // For read operations, require either admin or readonly label
    if (!hasAdminLabel && !hasReadOnlyLabel) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // User is authorized
    return null;
  } catch (error) {
    console.error('Auth error:', error);
    
    // During build time, don't return an error
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.NEXT_RUNTIME) {
      console.log('Build-time auth check, skipping');
      return null;
    }
    
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
}

/**
 * Check if the request is a mutation (POST, PUT, PATCH, DELETE)
 * @param req - Next.js request object
 * @returns boolean
 */
export function isMutationRequest(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

/**
 * Middleware to protect API routes with admin permissions
 * @param handler - API route handler
 * @returns Handler function
 */
export function withAdminAuth(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async function(req: NextRequest) {
    // For mutation requests, require write access
    const requireWriteAccess = isMutationRequest(req);
    
    // Check permissions
    const authError = await checkAdminPermissions(req, requireWriteAccess);
    if (authError) {
      return authError;
    }
    
    // User is authorized, proceed with the handler
    return handler(req);
  };
}
