'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, AdminPermission } from '@/lib/store/auth-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface AdminAuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: AdminPermission;
  redirectPath?: string;
}

export default function AdminAuthGuard({
  children,
  requiredPermission = AdminPermission.READ_ONLY, // Default to read-only permission
  redirectPath = '/'
}: AdminAuthGuardProps) {
  const router = useRouter();
  const { 
    adminPermission, 
    loading: authLoading, 
    checkAuth,
    hasReadPermission,
    hasWritePermission
  } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading) {
      let authorized = false;
      
      if (requiredPermission === AdminPermission.FULL_ACCESS) {
        authorized = hasWritePermission();
      } else if (requiredPermission === AdminPermission.READ_ONLY) {
        authorized = hasReadPermission();
      }
      
      setIsAuthorized(authorized);
      setIsLoading(false);
      
      // Redirect unauthorized users
      if (!authorized) {
        // Short delay to ensure the unauthorized message is shown briefly
        const timer = setTimeout(() => {
          router.push(redirectPath);
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [authLoading, adminPermission, requiredPermission, redirectPath, router, hasReadPermission, hasWritePermission]);

  if (isLoading || authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-12 h-12 text-blue-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Permissions</h2>
          <p className="text-gray-600">Please wait while we verify your access...</p>
        </Card>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center bg-red-50 border-red-200">
          <div className="flex justify-center mb-4">
            <ShieldX className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700 mb-6">
            {requiredPermission === AdminPermission.FULL_ACCESS
              ? "You need full admin access to view this page."
              : "You need at least read-only access to view this page."}
          </p>
          <Button onClick={() => router.push('/')} variant="outline" className="mx-auto">
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  // For read-only users viewing pages that normally have write actions
  if (requiredPermission === AdminPermission.FULL_ACCESS && adminPermission === AdminPermission.READ_ONLY) {
    return (
      <>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-medium text-amber-800">Read-Only Mode</h3>
              <p className="text-sm text-amber-700">
                You have read-only access. You can view all data but cannot make changes.
              </p>
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
